/**
 * MuJoCo-WASM substrate for the FlyGym Drosophila.
 *
 * Loads DeepMind's official single-threaded MuJoCo WASM engine, mounts the
 * exported fly model (`fly.xml` + 39 STL meshes) into the engine's virtual
 * filesystem, compiles it, and drives it under the manifest's control contract:
 *   - 42 position actuators, actuator index == control order
 *   - a controller emits u ∈ [-1,1]^42; we write ctrl[i] = clip(u[i]) * 3.14 rad
 *   - 250 Hz control = 40 mj_step's at a 1e-4 s physics timestep
 *   - units are millimetres, gravity -9810
 *
 * This module is pure engine + model plumbing — no React, no three.js — so it
 * can be unit-tested and reused. Rendering reads `geomXpos`/`geomXmat` (live
 * views into WASM memory) and the static `geoms`/`meshData` describe what to
 * draw. Everything is lazy: nothing here runs until `loadFlySim()` is called.
 */

// Types only — the runtime module is dynamically imported from /public so the
// ~9 MB WASM never lands in a route bundle that doesn't mount a FlyStage.
import type { MainModule, MjModel, MjData } from "@mujoco/mujoco";

type MujocoFactory = (opts?: unknown) => Promise<MainModule>;

/** MuJoCo geom type enum values we care about. */
const GEOM_MESH = 7;

const DEFAULT_MODEL_BASE = "/cellular-gaits/model";
const DEFAULT_WASM_URL = "/cellular-gaits/wasm/mujoco.wasm";
// The Emscripten ESM glue ships a Node-only `await import('module')` branch that
// bundlers can't resolve for the browser. We load it from /public at runtime
// (bundler-ignored) so it's never bundled and that branch never executes here.
const DEFAULT_GLUE_URL = "/cellular-gaits/wasm/mujoco.js";
const MODEL_FILE = "fly.xml";
const WORK_DIR = "/work";

/** One drawable geom: which mesh to use, where to read its world pose, colour. */
export type FlyGeom = {
  /** Geom index — read pose from geomXpos[gi*3..] / geomXmat[gi*9..]. */
  gi: number;
  /** Mesh dataid into meshData(). */
  meshid: number;
  rgba: [number, number, number, number];
};

/** Triangle mesh in the geom's local frame, in model units (mm). */
export type FlyMesh = {
  positions: Float32Array; // [x,y,z]*nvert
  indices: Uint32Array; // [a,b,c]*nface
};

export type FlySimMetrics = {
  thorax: [number, number, number];
  time: number;
  /** Planar distance travelled from the spawn point (mm). */
  distance: number;
  /** Heading relative to the spawn facing, degrees (0 = on course). */
  headingDeg: number;
};

/** FlyGym leg order for the 6 foot-contact booleans (matches the manifest). */
const LEG_PREFIXES = ["lf", "lm", "lh", "rf", "rm", "rh"] as const;

export type LoadFlyOptions = {
  modelBase?: string;
  wasmUrl?: string;
  glueUrl?: string;
  /** Progress callback for the loading UI. */
  onProgress?: (stage: string) => void;
  signal?: AbortSignal;
};

let factoryPromise: Promise<MujocoFactory> | null = null;
let wasmBinaryPromise: Promise<ArrayBuffer> | null = null;

// A truly native dynamic import the bundler can't see or rewrite — the Emscripten
// glue must be fetched from /public as a real ES module (its Node-only branches
// would otherwise break bundling, and a bundler-rewritten import never resolves).
const nativeImport: (url: string) => Promise<{ default: MujocoFactory }> = new Function(
  "u",
  "return import(u)",
) as never;

async function getFactory(glueUrl: string) {
  if (!factoryPromise) {
    factoryPromise = nativeImport(glueUrl).then((m) => m.default);
  }
  return factoryPromise;
}

async function getWasmBinary(url: string) {
  // No abort signal here on purpose: the binary is a process-wide cached
  // resource, so a single component unmount must not poison the shared promise
  // (which a later mount would reuse). Cancellation is handled at the call site
  // via the per-load signal checks in loadFlySim.
  if (!wasmBinaryPromise) {
    wasmBinaryPromise = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`wasm fetch failed: ${r.status}`);
        return r.arrayBuffer();
      })
      .catch((e) => {
        wasmBinaryPromise = null; // allow a retry on a later mount
        throw e;
      });
  }
  return wasmBinaryPromise;
}

/** Parse the unique mesh filenames referenced by the MJCF. */
function meshFilesFromXml(xml: string): string[] {
  const out = new Set<string>();
  const re = /file="([^"]+\.stl)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.add(m[1]);
  return [...out];
}

/**
 * The live, stepping fly simulation. Construct via `loadFlySim`.
 */
export class FlySim {
  readonly nu = 42;
  readonly substeps = 40;
  readonly ctrlScale = 3.14;

  private mod: MainModule;
  private model: MjModel;
  private data: MjData;
  private thoraxId: number;
  private keyId: number;

  // Live views into WASM memory — valid for the lifetime of `data`.
  private ctrl: Float64Array;
  private geomXposView: Float64Array;
  private geomXmatView: Float64Array;
  private xposView: Float64Array;
  private xmatView: Float64Array; // body world rotations, row-major 3×3 × nbody
  private actLenView: Float64Array; // actuator_length, 42 (== joint angles)
  private xfrcView: Float64Array; // xfrc_applied, [fx fy fz tx ty tz] × nbody

  readonly geoms: FlyGeom[];
  private meshes: Map<number, FlyMesh> = new Map();

  // Foot-contact plumbing: the ground geom id, a geom-id → leg-index map (any
  // tarsus segment of a leg counts as that leg's foot), and reusable buffers.
  private groundGeomId = -1;
  private legByGeom: Map<number, number> = new Map();
  private contactBuf = new Uint8Array(6);
  private actLenBuf = new Float64Array(42);

  private spawn: [number, number, number];
  private spawnHeading = 0;

  constructor(mod: MainModule, model: MjModel, data: MjData) {
    this.mod = mod;
    this.model = model;
    this.data = data;

    // Resolve named ids once, then release the accessor handles.
    const thorax = model.body("nmf/c_thorax");
    this.thoraxId = thorax.id;
    thorax.delete();

    let keyId = -1;
    try {
      const key = model.key("neutral");
      keyId = key.id;
      key.delete();
    } catch {
      keyId = -1;
    }
    this.keyId = keyId;

    // Live views.
    this.ctrl = data.ctrl as Float64Array;
    this.geomXposView = data.geom_xpos as Float64Array;
    this.geomXmatView = data.geom_xmat as Float64Array;
    this.xposView = data.xpos as Float64Array;
    this.xmatView = data.xmat as Float64Array;
    this.actLenView = data.actuator_length as Float64Array;
    this.xfrcView = data.xfrc_applied as Float64Array;

    this.resolveContactGeoms();

    this.geoms = this.buildGeomList();
    this.reset();
    this.spawn = this.thoraxXyz();
    this.spawnHeading = this.rawHeading();
  }

  /**
   * Resolve the ground geom id and map every leg tarsus geom to its leg index,
   * so a control-step contact scan can tell which feet are down. Best-effort:
   * if a name is absent (model variant) it's skipped and that foot just reads 0.
   */
  private resolveContactGeoms(): void {
    const m = this.model;
    const geomId = (name: string): number => {
      try {
        const g = m.geom(name);
        const id = g.id as number;
        g.delete();
        return id;
      } catch {
        return -1;
      }
    };
    this.groundGeomId = geomId("ground_plane");
    LEG_PREFIXES.forEach((prefix, leg) => {
      for (let seg = 1; seg <= 5; seg++) {
        const id = geomId(`nmf/${prefix}_tarsus${seg}`);
        if (id >= 0) this.legByGeom.set(id, leg);
      }
    });
  }

  /** World heading of the thorax x-axis, radians, atan2(y, x). */
  private rawHeading(): number {
    const o = this.thoraxId * 9;
    const ax = this.xmatView[o]; // column-0 x (body forward, world x component)
    const ay = this.xmatView[o + 3]; // column-0 y
    return Math.atan2(ay, ax);
  }

  private buildGeomList(): FlyGeom[] {
    const m = this.model;
    const ngeom = m.ngeom as number;
    const gtype = m.geom_type as Int32Array;
    const gdata = m.geom_dataid as Int32Array;
    const grgba = m.geom_rgba as Float32Array;
    const gmat = m.geom_matid as Int32Array;
    const matrgba = m.mat_rgba as Float32Array;

    const list: FlyGeom[] = [];
    for (let gi = 0; gi < ngeom; gi++) {
      if (gtype[gi] !== GEOM_MESH) continue; // ground plane drawn separately
      const meshid = gdata[gi];
      if (meshid < 0) continue;

      let rgba: [number, number, number, number] = [
        grgba[gi * 4],
        grgba[gi * 4 + 1],
        grgba[gi * 4 + 2],
        grgba[gi * 4 + 3],
      ];
      // A geom with the MuJoCo default (0.5,0.5,0.5,1) and a material defers to
      // the material colour.
      const matid = gmat[gi];
      if (matid >= 0 && matrgba) {
        rgba = [
          matrgba[matid * 4],
          matrgba[matid * 4 + 1],
          matrgba[matid * 4 + 2],
          matrgba[matid * 4 + 3],
        ];
      }
      if (!this.meshes.has(meshid)) this.meshes.set(meshid, this.extractMesh(meshid));
      list.push({ gi, meshid, rgba });
    }
    return list;
  }

  private extractMesh(meshid: number): FlyMesh {
    const m = this.model;
    const vertadr = (m.mesh_vertadr as Int32Array)[meshid];
    const vertnum = (m.mesh_vertnum as Int32Array)[meshid];
    const faceadr = (m.mesh_faceadr as Int32Array)[meshid];
    const facenum = (m.mesh_facenum as Int32Array)[meshid];
    const mvert = m.mesh_vert as Float32Array;
    const mface = m.mesh_face as Int32Array;

    const positions = new Float32Array(vertnum * 3);
    for (let i = 0; i < vertnum * 3; i++) positions[i] = mvert[vertadr * 3 + i];

    const indices = new Uint32Array(facenum * 3);
    for (let i = 0; i < facenum * 3; i++) indices[i] = mface[faceadr * 3 + i];

    return { positions, indices };
  }

  meshData(meshid: number): FlyMesh {
    const mesh = this.meshes.get(meshid);
    if (!mesh) throw new Error(`mesh ${meshid} not built`);
    return mesh;
  }

  /** Live view: world positions of every geom, [x,y,z]*ngeom. */
  get geomXpos(): Float64Array {
    return this.geomXposView;
  }
  /** Live view: world rotations of every geom, row-major 3×3 *ngeom. */
  get geomXmat(): Float64Array {
    return this.geomXmatView;
  }

  thoraxXyz(): [number, number, number] {
    const o = this.thoraxId * 3;
    return [this.xposView[o], this.xposView[o + 1], this.xposView[o + 2]];
  }

  /** Run one control step: write ctrl from u ∈ [-1,1]^42, then 40 mj_step's. */
  controlStep(u: Float32Array): void {
    const s = this.ctrlScale;
    for (let i = 0; i < this.nu; i++) {
      const v = u[i] < -1 ? -1 : u[i] > 1 ? 1 : u[i];
      this.ctrl[i] = v * s;
    }
    for (let k = 0; k < this.substeps; k++) {
      this.mod.mj_step(this.model, this.data);
    }
  }

  /**
   * Live proprioception, channel ch4 of the closed-loop controller: the 42
   * actuated joint angles (`actuator_length`, actuator/control order, radians).
   * Returns a reused buffer.
   */
  actuatorLengths(): Float64Array {
    const out = this.actLenBuf;
    for (let i = 0; i < this.nu; i++) out[i] = this.actLenView[i] ?? 0;
    return out;
  }

  /**
   * Live proprioception, channel ch5: the 6 per-leg foot-contact booleans
   * (1 if any tarsus segment of that leg is touching the ground this step),
   * leg order [lf, lm, lh, rf, rm, rh]. Returns a reused buffer.
   */
  footContacts(): Uint8Array {
    const out = this.contactBuf;
    out.fill(0);
    if (this.groundGeomId < 0 || this.legByGeom.size === 0) return out;
    const contacts = this.data.contact;
    const ncon = this.data.ncon as number;
    for (let i = 0; i < ncon; i++) {
      const c = contacts.get(i);
      if (!c) continue;
      const g1 = c.geom1 as number;
      const g2 = c.geom2 as number;
      // contacts are deduped value-objects in embind; release the handle.
      (c as unknown as { delete?: () => void }).delete?.();
      let leg = -1;
      if (g1 === this.groundGeomId) leg = this.legByGeom.get(g2) ?? -1;
      else if (g2 === this.groundGeomId) leg = this.legByGeom.get(g1) ?? -1;
      if (leg >= 0) out[leg] = 1;
    }
    return out;
  }

  /**
   * Apply a constant external force (mm·force units) to the thorax — the lever
   * for the perturbation "shove". Persists across `controlStep`s until cleared.
   */
  setThoraxForce(fx: number, fy: number, fz: number): void {
    const o = this.thoraxId * 6;
    this.xfrcView[o] = fx;
    this.xfrcView[o + 1] = fy;
    this.xfrcView[o + 2] = fz;
  }

  /** Zero any applied force/torque on the thorax. */
  clearThoraxForce(): void {
    const o = this.thoraxId * 6;
    for (let k = 0; k < 6; k++) this.xfrcView[o + k] = 0;
  }

  metrics(): FlySimMetrics {
    const t = this.thoraxXyz();
    const dx = t[0] - this.spawn[0];
    const dy = t[1] - this.spawn[1];
    let dh = this.rawHeading() - this.spawnHeading;
    // wrap to (-π, π]
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    return {
      thorax: t,
      time: this.data.time as number,
      distance: Math.hypot(dx, dy),
      headingDeg: (dh * 180) / Math.PI,
    };
  }

  reset(): void {
    if (this.keyId >= 0) {
      this.mod.mj_resetDataKeyframe(this.model, this.data, this.keyId);
    } else {
      this.mod.mj_resetData(this.model, this.data);
    }
    this.clearThoraxForce();
    this.mod.mj_forward(this.model, this.data);
    this.spawn = this.thoraxXyz();
    this.spawnHeading = this.rawHeading();
  }

  dispose(): void {
    try {
      this.data.delete();
    } catch {
      /* already freed */
    }
    try {
      this.model.delete();
    } catch {
      /* already freed */
    }
  }
}

/**
 * Load the engine + fly model and return a ready-to-step `FlySim`.
 * The WASM binary and the engine factory are cached across calls.
 */
export async function loadFlySim(opts: LoadFlyOptions = {}): Promise<FlySim> {
  const modelBase = opts.modelBase ?? DEFAULT_MODEL_BASE;
  const wasmUrl = opts.wasmUrl ?? DEFAULT_WASM_URL;
  const glueUrl = opts.glueUrl ?? DEFAULT_GLUE_URL;
  const report = opts.onProgress ?? (() => {});

  report("loading engine");
  const [factory, wasmBinary] = await Promise.all([
    getFactory(glueUrl),
    getWasmBinary(wasmUrl),
  ]);
  opts.signal?.throwIfAborted();

  const mod = await factory({
    wasmBinary,
    locateFile: (path: string) => (path.endsWith(".wasm") ? wasmUrl : path),
  });
  opts.signal?.throwIfAborted();

  report("loading model");
  const xml = await fetch(`${modelBase}/${MODEL_FILE}`, { signal: opts.signal }).then((r) => {
    if (!r.ok) throw new Error(`model fetch failed: ${r.status}`);
    return r.text();
  });
  const meshFiles = meshFilesFromXml(xml);
  const meshBuffers = await Promise.all(
    meshFiles.map((f) =>
      fetch(`${modelBase}/${f}`, { signal: opts.signal }).then((r) => {
        if (!r.ok) throw new Error(`mesh fetch failed (${f}): ${r.status}`);
        return r.arrayBuffer();
      }),
    ),
  );
  opts.signal?.throwIfAborted();

  report("compiling");
  // Mount everything into the engine's virtual filesystem.
  try {
    mod.FS.mkdir(WORK_DIR);
  } catch {
    /* dir may already exist from a prior load */
  }
  mod.FS.writeFile(`${WORK_DIR}/${MODEL_FILE}`, xml);
  meshFiles.forEach((f, i) => {
    mod.FS.writeFile(`${WORK_DIR}/${f}`, new Uint8Array(meshBuffers[i]));
  });

  const model = mod.MjModel.from_xml_path(`${WORK_DIR}/${MODEL_FILE}`);
  const data = new mod.MjData(model);

  report("ready");
  return new FlySim(mod, model, data);
}
