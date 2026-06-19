"use client";

/**
 * <FlyStage> — the shared physics + render surface for the physics-bound tabs.
 *
 * It loads the real MuJoCo WASM engine + the FlyGym Drosophila and runs it live
 * in the browser: a controller emits a 42-vector u ∈ [-1,1] once per 250 Hz
 * control step, we write ctrl per the manifest contract and advance 40 mj_step's,
 * then render the meshes with three.js. The default controller is the *real*
 * evolved NCA from `lib/nca.ts` — i.e. the headline is your controller walking
 * the real fly, live.
 *
 * Everything heavy (WASM, three.js, the model) is dynamically imported inside an
 * effect, so this never runs at module load and never bloats routes that don't
 * mount a FlyStage. Use it via `next/dynamic` with `ssr:false`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";
import type { FlySim, FlySimMetrics } from "@/lib/mujoco-fly";

export type FlyStageMetrics = FlySimMetrics & { fps: number };

export type FlyStageCtx = {
  time: number;
  controlStep: number;
  sim: FlySim;
};

/** A controller: called once per control step, returns 42 targets in [-1,1]. */
export type FlyStageController = (ctx: FlyStageCtx) => Float32Array;

type Props = {
  /** Defaults to the evolved NCA walking the fly. */
  controller?: FlyStageController;
  /** Initial run state (the on-canvas buttons take over after mount). */
  running?: boolean;
  onStep?: (m: FlyStageMetrics) => void;
  cameraTracking?: boolean;
  /** If live physics isn't viable on this device, show this mp4 instead. */
  fallbackClipSrc?: string;
  height?: number;
  className?: string;
  /**
   * Increment to fire a calibrated lateral impulse on the thorax (the
   * "shove"). The force is applied at control-step granularity for
   * `shoveDurationS` so the disturbance is fps-independent.
   */
  shoveSignal?: number;
  /** Lateral force magnitude (model units). Matches the C2-A sweep (6.0). */
  shoveMagnitude?: number;
  /** How long the impulse is held, seconds (C2-A: 0.05). */
  shoveDurationS?: number;
  /**
   * Increment to reset the sim from the parent (re-pose + restart the
   * controller). The on-canvas reset button does the same thing.
   */
  resetSignal?: number;
};

// Real-time pacing: 1 control step = 4 ms sim. Run a wall-clock accumulator so
// we track real time when the hardware can, and degrade gracefully (capped) when
// it can't, instead of spiralling.
const CONTROL_DT_S = 0.004;
const MAX_STEPS_PER_FRAME = 6; // budget cap → physics never starves the renderer
const MAX_FRAME_DT_S = 0.05; // clamp long stalls (tab switches, GC)

export function FlyStage({
  controller,
  running = true,
  onStep,
  cameraTracking = true,
  fallbackClipSrc,
  height = 380,
  className,
  shoveSignal = 0,
  shoveMagnitude = 6,
  shoveDurationS = 0.05,
  resetSignal = 0,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error" | "fallback">("loading");
  const [stage, setStage] = useState("loading engine");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(running);

  // Mutable refs the rAF loop reads without re-subscribing.
  const runningRef = useRef(running);
  const controllerRef = useRef<FlyStageController | undefined>(controller);
  const trackingRef = useRef(cameraTracking);
  const resetTick = useRef(0); // internal reset counter (button + resetSignal prop)
  const shoveTick = useRef(0); // latest shove request the loop has not yet started
  const shoveCfg = useRef({ magnitude: shoveMagnitude, durationS: shoveDurationS });

  useEffect(() => {
    runningRef.current = isRunning;
  }, [isRunning]);
  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);
  useEffect(() => {
    trackingRef.current = cameraTracking;
  }, [cameraTracking]);
  useEffect(() => {
    shoveCfg.current = { magnitude: shoveMagnitude, durationS: shoveDurationS };
  }, [shoveMagnitude, shoveDurationS]);
  // A parent shoveSignal bump becomes a pending shove the loop picks up.
  useEffect(() => {
    if (shoveSignal > 0) shoveTick.current = shoveSignal;
  }, [shoveSignal]);
  // A parent resetSignal bump routes through the same path as the reset button.
  useEffect(() => {
    if (resetSignal > 0) resetTick.current++;
  }, [resetSignal]);

  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  useEffect(() => {
    if (fallbackClipSrc && phase === "fallback") return;
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    const abort = new AbortController();
    let raf = 0;
    let renderer: THREE_NS.WebGLRenderer | null = null;
    let sim: FlySim | null = null;
    const disposables: { dispose: () => void }[] = [];

    (async () => {
      try {
        // Dynamic imports keep three.js + WASM out of every other bundle.
        const THREE = await import("three");
        const { loadFlySim } = await import("@/lib/mujoco-fly");
        const { loadController, makeNcaController } = await import("@/lib/nca");

        sim = await loadFlySim({ onProgress: setStage, signal: abort.signal });
        if (disposed) return;

        // Default controller = the real evolved NCA, unless the caller supplies one.
        if (!controllerRef.current) {
          const weights = await loadController();
          if (disposed) return;
          const nca = makeNcaController(weights);
          const buf = nca; // capture
          controllerRef.current = () => buf.motors();
          // Reset re-seeds the NCA so the gait restarts deterministically.
          (sim as FlySim & { _ncaReset?: () => void })._ncaReset = () => buf.reset();
        }

        // ---- three.js scene ----
        const width = mount.clientWidth || 640;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b0b0c);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 5000);
        camera.up.set(0, 0, 1); // MuJoCo is Z-up

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = false; // lever: shadows off
        mount.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.borderRadius = "10px";

        scene.add(new THREE.HemisphereLight(0xffffff, 0x404048, 1.1));
        const dir = new THREE.DirectionalLight(0xffffff, 1.4);
        dir.position.set(4, -6, 12);
        scene.add(dir);

        // Ground grid in the XY plane (z up).
        const grid = new THREE.GridHelper(400, 80, 0x2a2a2e, 0x1a1a1d);
        grid.rotation.x = Math.PI / 2;
        scene.add(grid);

        // Build a three.js mesh per drawable geom; update transforms each frame.
        const meshes: { mesh: THREE_NS.Mesh; gi: number }[] = [];
        for (const g of sim.geoms) {
          const md = sim.meshData(g.meshid);
          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.BufferAttribute(md.positions, 3));
          geom.setIndex(new THREE.BufferAttribute(md.indices, 1));
          geom.computeVertexNormals();
          const [r, gr, b, a] = g.rgba;
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(r, gr, b),
            roughness: 0.7,
            metalness: 0.0,
            transparent: a < 1,
            opacity: a,
            flatShading: false,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.matrixAutoUpdate = false;
          scene.add(mesh);
          meshes.push({ mesh, gi: g.gi });
          disposables.push(geom, mat);
        }

        // Resize handling.
        const ro = new ResizeObserver(() => {
          if (!renderer) return;
          const w = mount.clientWidth || width;
          renderer.setSize(w, height);
          camera.aspect = w / height;
          camera.updateProjectionMatrix();
        });
        ro.observe(mount);

        // Pause physics when the tab/section is not visible.
        let onScreen = true;
        const io = new IntersectionObserver(
          (entries) => {
            onScreen = entries[0]?.isIntersecting ?? true;
          },
          { threshold: 0.01 },
        );
        io.observe(mount);

        const tmp = new THREE.Matrix4();
        const camTarget = new THREE.Vector3();
        let controlStep = 0;
        let lastReset = resetTick.current;
        let lastShove = shoveTick.current;
        let shoveStepsLeft = 0;
        let shoveSign = 1;
        let prevT = performance.now();
        let acc = 0;
        let fps = 0;
        let lastEmit = 0;

        const render = () => {
          const xpos = sim!.geomXpos;
          const xmat = sim!.geomXmat;
          for (const { mesh, gi } of meshes) {
            const p = gi * 3;
            const r = gi * 9;
            tmp.set(
              xmat[r], xmat[r + 1], xmat[r + 2], xpos[p],
              xmat[r + 3], xmat[r + 4], xmat[r + 5], xpos[p + 1],
              xmat[r + 6], xmat[r + 7], xmat[r + 8], xpos[p + 2],
              0, 0, 0, 1,
            );
            mesh.matrix.copy(tmp);
            mesh.matrixWorldNeedsUpdate = true;
          }
          const t = sim!.thoraxXyz();
          if (trackingRef.current) {
            camTarget.set(t[0], t[1], t[2]);
            camera.position.set(t[0] + 5, t[1] - 9, t[2] + 5);
            camera.lookAt(camTarget);
          }
          renderer!.render(scene, camera);
        };

        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min((now - prevT) / 1000, MAX_FRAME_DT_S);
          prevT = now;

          // fps EMA
          const inst = dt > 0 ? 1 / dt : 0;
          fps = fps === 0 ? inst : fps * 0.9 + inst * 0.1;

          // Reset requested from the UI (button or parent resetSignal).
          if (resetTick.current !== lastReset) {
            lastReset = resetTick.current;
            sim!.reset(); // also clears any applied force
            (sim as FlySim & { _ncaReset?: () => void })._ncaReset?.();
            controlStep = 0;
            acc = 0;
            shoveStepsLeft = 0;
          }

          // A new shove request → hold the lateral impulse for the pert window,
          // alternating direction each time so repeated shoves stay interesting.
          if (shoveTick.current !== lastShove) {
            lastShove = shoveTick.current;
            shoveStepsLeft = Math.max(1, Math.round(shoveCfg.current.durationS / CONTROL_DT_S));
            shoveSign = -shoveSign;
          }

          const ctrl = controllerRef.current;
          if (runningRef.current && onScreen && ctrl) {
            acc += dt;
            let steps = 0;
            while (acc >= CONTROL_DT_S && steps < MAX_STEPS_PER_FRAME) {
              // Apply the shove force for the control steps inside its window.
              if (shoveStepsLeft > 0) {
                sim!.setThoraxForce(0, shoveSign * shoveCfg.current.magnitude, 0);
                shoveStepsLeft--;
                if (shoveStepsLeft === 0) sim!.clearThoraxForce();
              }
              const u = ctrl({ time: sim!.metrics().time, controlStep, sim: sim! });
              sim!.controlStep(u);
              acc -= CONTROL_DT_S;
              controlStep++;
              steps++;
            }
            // If we hit the budget, drop the backlog so we don't spiral.
            if (acc > CONTROL_DT_S) acc = 0;
          }

          render();

          if (onStepRef.current && now - lastEmit > 100) {
            lastEmit = now;
            const m = sim!.metrics();
            onStepRef.current({ ...m, fps });
          }
        };

        disposables.push({ dispose: () => ro.disconnect() });
        disposables.push({ dispose: () => io.disconnect() });

        setPhase("ready");
        raf = requestAnimationFrame(loop);
      } catch (e) {
        if (disposed || (e instanceof DOMException && e.name === "AbortError")) return;
        console.error("[FlyStage]", e);
        setErrMsg(e instanceof Error ? e.message : String(e));
        if (fallbackClipSrc) setPhase("fallback");
        else setPhase("error");
      }
    })();

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      for (const d of disposables) {
        try {
          d.dispose();
        } catch {
          /* noop */
        }
      }
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      sim?.dispose();
    };
    // Intentionally only re-init when the model height or fallback source change.
    // `phase` is read inside but must NOT be a dep, or setting it would tear down
    // and reload the whole engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackClipSrc, height]);

  const onReset = useCallback(() => {
    resetTick.current++;
  }, []);

  if (phase === "fallback" && fallbackClipSrc) {
    return (
      <div className={className} style={{ position: "relative" }}>
        <video
          src={fallbackClipSrc}
          autoPlay
          loop
          muted
          playsInline
          style={{ width: "100%", height, objectFit: "cover", borderRadius: 10 }}
        />
        <p className="cg-tab-todo" style={{ marginTop: 6 }}>
          live physics unavailable on this device — showing recorded rollout
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={mountRef}
        className="cg-flystage-canvas"
        style={{ position: "relative", width: "100%", height, borderRadius: 10, overflow: "hidden", background: "#0b0b0c" }}
        role="img"
        aria-label="Live MuJoCo simulation of the FlyGym Drosophila driven by the evolved controller"
      >
        {phase === "loading" && (
          <div className="cg-flystage-overlay">
            <span className="cg-flystage-spinner" aria-hidden />
            <span>{stage}…</span>
          </div>
        )}
        {phase === "error" && (
          <div className="cg-flystage-overlay">
            <span>could not start live physics</span>
            {errMsg && <span className="cg-flystage-err">{errMsg}</span>}
          </div>
        )}
      </div>

      <div className="cg-flystage-controls">
        <button className="cg-pg-btn" onClick={() => setIsRunning((r) => !r)} disabled={phase !== "ready"}>
          {isRunning ? "pause" : "play"}
        </button>
        <button className="cg-pg-btn" onClick={onReset} disabled={phase !== "ready"}>
          reset
        </button>
      </div>
    </div>
  );
}

export default FlyStage;
