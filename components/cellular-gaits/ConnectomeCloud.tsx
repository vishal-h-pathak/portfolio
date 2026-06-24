"use client";

/**
 * <ConnectomeCloud> — the real escape circuit, in real 3-D space, lighting up
 * (The Embodied Fly, R2-WP4). The honest, anatomical counterpart to the
 * schematic <BrainCircuitMap>: instead of a hand-drawn silhouette, this renders
 * the **316 actual escape-circuit neurons at their measured FlyWire v783
 * positions** (104 LC4 + 210 LPLC2 + 2 DNp01) as a Three.js point cloud, lit by
 * the **real per-window LIF firing activity we already computed** (the `data-eb`
 * traces) — not predicted/decorative like Eon's glowing-brain vision.
 *
 *   resting        → cool + dim (teal lobula, violet Giant Fiber)
 *   looming threat → the threat-side LC4/LPLC2 warm up to amber (brain.hz_L/hz_R)
 *   DNp01 fires    → the Giant Fiber blooms warm gold (brain.dnp01_L/dnp01_R)
 *   baseline       → stays dark (GF silent → the fly merely walks)
 *
 * Tied to the condition toggle (left / right / baseline) and scrubbable along
 * the escape timeline (the 75 sync-windows). The left>right detector split and
 * the right>left Giant-Fiber asymmetry are both visible as which points flare.
 *
 * Data plumbing mirrors <EmbodiedConditions>: the heavy traces are client-fetched
 * from `/cellular-gaits/data-eb/` (positions + the three per-run traces), so they
 * don't bloat the document. Nothing science-bearing is hardcoded — a re-export of
 * the bundle flows straight through; the activity normalisers are derived from the
 * loaded data.
 *
 * Honest: only the neurons we actually computed light up. The dim full-brain
 * ~139k backdrop (Eon's exact look) is NOT in positions.json (that is the
 * 316-circuit only) — there is a clean hook for it (`backdropUrl`), and it is
 * flagged as a small cellular-gaits follow-up (wave 2). It is not built here.
 *
 * Perf/mobile: 316 points is trivial; WebGL is disposed on unmount, auto-rotate
 * and timeline autoplay honour prefers-reduced-motion, and a missing-WebGL /
 * failed-fetch path degrades to a readable note.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ── palette (matches the site tokens used across the escape pages) ──
const DETECTOR_REST = new THREE.Color(0.11, 0.34, 0.38); // dim teal — the lobula detectors at rest
const DETECTOR_HOT = new THREE.Color(0.91, 0.61, 0.24); // #E89B3D amber — the real circuit, firing
const GF_REST = new THREE.Color(0.30, 0.18, 0.44); // dim violet — the Giant Fiber at rest
const GF_HOT = new THREE.Color(0.98, 0.82, 0.42); // warm gold — DNp01 firing (blooms toward white)
const GF_WHITE = new THREE.Color(1.0, 0.97, 0.86);

export type CloudCondition = {
  key: string;
  label: string;
  azimuth_deg: number | null;
  trace: string;
  gf_peak_hz: number;
  outcome: string;
};

type Neuron = {
  id: number;
  type: "LC4" | "LPLC2" | "DNp01";
  hemisphere: "left" | "right";
  x: number;
  y: number;
  z: number;
};
type Positions = {
  flywire_release?: string;
  coordinate_frame?: string;
  counts: { LC4: number; LPLC2: number; DNp01: number };
  n_neurons: number;
  neurons: Neuron[];
};
type Brain = {
  t_s: number[];
  hz_L: number[];
  hz_R: number[];
  dnp01_L: number[];
  dnp01_R: number[];
  dnp01_mean: number[];
};
type Trace = { condition: string; brain: Brain };

const BASE = "/cellular-gaits/data-eb";

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth(t: number) {
  // smoothstep — a touch of ease so flares read as "switching on"
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

// activity in [0,1] for one neuron at window w, from the per-side traces
function activityFor(n: Neuron, b: Brain, w: number, hzRef: number, gfRef: number): number {
  if (n.type === "DNp01") {
    const raw = (n.hemisphere === "left" ? b.dnp01_L[w] : b.dnp01_R[w]) ?? 0;
    return clamp01(raw / gfRef);
  }
  const raw = (n.hemisphere === "left" ? b.hz_L[w] : b.hz_R[w]) ?? 0;
  return clamp01(raw / hzRef);
}

export function ConnectomeCloud({ conditions, backdropUrl }: { conditions: CloudCondition[]; backdropUrl?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  // loaded data
  const [positions, setPositions] = useState<Positions | null>(null);
  const [traces, setTraces] = useState<Record<string, Trace> | null>(null);
  const [error, setError] = useState(false);

  // controls
  const [condKey, setCondKey] = useState(conditions[0]?.key ?? "left_threat");
  const [windowIndex, setWindowIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const reducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cond = conditions.find((c) => c.key === condKey) ?? conditions[0];
  const brain = traces?.[condKey]?.brain ?? null;
  const nWindows = brain?.t_s.length ?? 0;

  // activity normalisers, derived from the loaded data (max across all runs)
  const { hzRef, gfRef } = useMemo(() => {
    if (!traces) return { hzRef: 1, gfRef: 1 };
    let hz = 0;
    let gf = 0;
    for (const c of conditions) {
      const b = traces[c.key]?.brain;
      if (!b) continue;
      hz = Math.max(hz, ...b.hz_L, ...b.hz_R);
      gf = Math.max(gf, ...b.dnp01_L, ...b.dnp01_R);
    }
    return { hzRef: hz > 0 ? hz : 1, gfRef: gf > 0 ? gf : 1 };
  }, [traces, conditions]);

  // the most-active window for this condition (the static default for
  // reduced-motion users, and where the flare is clearest)
  const peakWindow = useMemo(() => {
    if (!brain) return 0;
    let best = 0;
    let bestV = -1;
    for (let i = 0; i < brain.dnp01_mean.length; i++) {
      const v = brain.dnp01_mean[i] ?? 0;
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    }
    return bestV > 0 ? best : 0;
  }, [brain]);

  // ── fetch positions + all three traces once (mirrors EmbodiedConditions) ──
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${BASE}/positions.json`).then((r) => {
        if (!r.ok) throw new Error(`positions: ${r.status}`);
        return r.json() as Promise<Positions>;
      }),
      Promise.all(
        conditions.map((c) =>
          fetch(`${BASE}/${c.trace}`).then((r) => {
            if (!r.ok) throw new Error(`${c.trace}: ${r.status}`);
            return r.json() as Promise<Trace>;
          }),
        ),
      ),
    ])
      .then(([pos, traceArr]) => {
        if (cancelled) return;
        const map: Record<string, Trace> = {};
        conditions.forEach((c, i) => (map[c.key] = traceArr[i]));
        setPositions(pos);
        setTraces(map);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [conditions]);

  // when data first lands (or the condition changes), seat the scrubber: at the
  // start for an animated reveal, or at the lit peak when motion is reduced.
  useEffect(() => {
    if (!brain) return;
    setWindowIndex(reducedMotion ? peakWindow : 0);
    setPlaying(!reducedMotion);
  }, [condKey, brain, reducedMotion, peakWindow]);

  // ── the Three.js scene (built once data is present) ──
  // imperative handles shared across the effect and the per-frame updates
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group;
    geom: THREE.BufferGeometry;
    colorAttr: THREE.BufferAttribute;
    sizeAttr: THREE.BufferAttribute;
    intensityAttr: THREE.BufferAttribute;
    material: THREE.ShaderMaterial;
  } | null>(null);

  // expose the current scrub target to the RAF loop without re-creating it
  const stateRef = useRef({ windowIndex: 0, playing: false, reducedMotion: false, brain: null as Brain | null });
  stateRef.current = { windowIndex, playing, reducedMotion, brain };

  // recolour the cloud for a given window
  const paintWindow = useMemo(() => {
    return (w: number) => {
      const s = sceneRef.current;
      const pos = positions;
      const b = stateRef.current.brain;
      if (!s || !pos || !b) return;
      const N = pos.neurons.length;
      const c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const n = pos.neurons[i];
        const a = activityFor(n, b, w, hzRef, gfRef);
        const e = smooth(a);
        const isGF = n.type === "DNp01";
        if (isGF) {
          c.copy(GF_REST).lerp(GF_HOT, e);
          if (e > 0.6) c.lerp(GF_WHITE, (e - 0.6) / 0.4 * 0.5); // bloom toward white near peak
        } else {
          c.copy(DETECTOR_REST).lerp(DETECTOR_HOT, e);
        }
        s.colorAttr.setXYZ(i, c.r, c.g, c.b);
        s.intensityAttr.setX(i, e);
        // base size: the 2 Giant-Fiber cells read a touch larger so the climax is findable
        const base = isGF ? 0.85 : 0.5;
        s.sizeAttr.setX(i, base + e * (isGF ? 1.5 : 1.0));
      }
      s.colorAttr.needsUpdate = true;
      s.intensityAttr.needsUpdate = true;
      s.sizeAttr.needsUpdate = true;
    };
  }, [positions, hzRef, gfRef]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !positions) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }
    const getSize = () => {
      const w = mount.clientWidth || 640;
      const h = Math.max(320, Math.round(w * 0.62));
      return { w, h };
    };
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    renderer.setPixelRatio(dpr);
    const { w: w0, h: h0 } = getSize();
    renderer.setSize(w0, h0, false);
    renderer.setClearColor(0x000000, 0); // pure transparent → the card's near-black shows through
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "auto";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y"; // let the page scroll vertically over the canvas
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w0 / h0, 0.1, 100);
    camera.position.set(0, 0, 3.6);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    // ── geometry: real XYZ, centred + scaled to fit, FAFB → screen-friendly axes
    //    (negate y so dorsal is up, negate z so anterior faces the camera) ──
    const neurons = positions.neurons;
    const N = neurons.length;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const n of neurons) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
      if (n.z < minZ) minZ = n.z;
      if (n.z > maxZ) maxZ = n.z;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const half = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2 || 1;
    const s = 1.1 / half; // fit within ~±1.1 world units (stays in frame as it rotates)

    const posArr = new Float32Array(N * 3);
    const colArr = new Float32Array(N * 3);
    const sizeArr = new Float32Array(N);
    const intenArr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const n = neurons[i];
      posArr[i * 3] = (n.x - cx) * s;
      posArr[i * 3 + 1] = -(n.y - cy) * s;
      posArr[i * 3 + 2] = -(n.z - cz) * s;
      colArr[i * 3] = DETECTOR_REST.r;
      colArr[i * 3 + 1] = DETECTOR_REST.g;
      colArr[i * 3 + 2] = DETECTOR_REST.b;
      sizeArr[i] = 0.5;
      intenArr[i] = 0;
    }
    const geom = new THREE.BufferGeometry();
    const colorAttr = new THREE.BufferAttribute(colArr, 3);
    const sizeAttr = new THREE.BufferAttribute(sizeArr, 1);
    const intensityAttr = new THREE.BufferAttribute(intenArr, 1);
    geom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    geom.setAttribute("aColor", colorAttr);
    geom.setAttribute("aSize", sizeAttr);
    geom.setAttribute("aIntensity", intensityAttr);

    const material = new THREE.ShaderMaterial({
      // uScale ∝ dpr so on-screen (CSS) point size is resolution-independent;
      // ~22 puts resting points near 3 CSS px and a firing Giant Fiber near 16.
      uniforms: { uScale: { value: dpr * 22 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aIntensity;
        uniform float uScale;
        varying vec3 vColor;
        varying float vIntensity;
        void main() {
          vColor = aColor;
          vIntensity = aIntensity;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float sz = aSize * uScale / max(-mv.z, 0.001);
          gl_PointSize = clamp(sz, 1.2, 48.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying vec3 vColor;
        varying float vIntensity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float alpha = core * (0.40 + vIntensity * 0.60);
          vec3 col = vColor * (0.55 + vIntensity * 1.05);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const points = new THREE.Points(geom, material);
    group.add(points);

    // ── optional dim full-brain backdrop layer (HOOK ONLY) ──────────────────
    // positions.json is the 316-circuit; the ~139k resting full-brain positions
    // are a flagged cellular-gaits follow-up (wave 2). When that asset exists,
    // pass `backdropUrl` and it renders as a dim static silhouette behind the
    // circuit (Eon's exact look). Until then this is inert.
    let backdropPoints: THREE.Points | null = null;
    let backdropGeom: THREE.BufferGeometry | null = null;
    let backdropMat: THREE.PointsMaterial | null = null;
    let backdropCancelled = false;
    if (backdropUrl) {
      fetch(backdropUrl)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((bp: { neurons?: { x: number; y: number; z: number }[] } | number[][]) => {
          if (backdropCancelled) return;
          const raw = Array.isArray(bp) ? bp : bp.neurons ?? [];
          const M = raw.length;
          if (!M) return;
          const ba = new Float32Array(M * 3);
          for (let i = 0; i < M; i++) {
            const p = raw[i] as { x: number; y: number; z: number } | number[];
            const px = Array.isArray(p) ? p[0] : p.x;
            const py = Array.isArray(p) ? p[1] : p.y;
            const pz = Array.isArray(p) ? p[2] : p.z;
            ba[i * 3] = (px - cx) * s;
            ba[i * 3 + 1] = -(py - cy) * s;
            ba[i * 3 + 2] = -(pz - cz) * s;
          }
          backdropGeom = new THREE.BufferGeometry();
          backdropGeom.setAttribute("position", new THREE.BufferAttribute(ba, 3));
          backdropMat = new THREE.PointsMaterial({
            color: 0x2a3340,
            size: 0.9,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          backdropPoints = new THREE.Points(backdropGeom, backdropMat);
          group.add(backdropPoints);
        })
        .catch(() => {
          /* backdrop is optional — failing to load it never breaks the circuit */
        });
    }

    sceneRef.current = { renderer, scene, camera, group, geom, colorAttr, sizeAttr, intensityAttr, material };

    // initial paint at the seated window
    paintWindow(stateRef.current.windowIndex);

    // ── orbit: gentle auto-rotate + pointer drag (no extra deps) ──
    // default 3/4 anterior-dorsal tilt so depth reads
    group.rotation.x = -0.32;
    group.rotation.y = 0.0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let userInteracted = false;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      userInteracted = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      group.rotation.y += dx * 0.008;
      group.rotation.x = THREE.MathUtils.clamp(group.rotation.x + dy * 0.008, -1.2, 1.2);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // ── resize ──
    const onResize = () => {
      const { w, h } = getSize();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      material.uniforms.uScale.value = dpr * 22;
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(mount);

    // ── RAF: auto-rotate (unless reduced motion / dragging) + timeline autoplay ──
    let raf = 0;
    let lastTime = 0;
    let acc = 0;
    let shownWindow = -1;
    let shownBrain: Brain | null = null;
    const STEP_MS = 70; // ~5s sweep across 75 windows, then loop
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = lastTime ? t - lastTime : 16;
      lastTime = t;

      const st = stateRef.current;
      if (!dragging && !st.reducedMotion && !userInteracted) {
        group.rotation.y += 0.0016 * dt;
      } else if (!dragging && !st.reducedMotion) {
        group.rotation.y += 0.0006 * dt; // keep a faint drift even after interaction
      }

      // timeline autoplay advances the scrubber via React state (keeps UI in sync)
      if (st.playing && st.brain && st.brain.t_s.length > 0) {
        acc += dt;
        if (acc >= STEP_MS) {
          acc = 0;
          const next = (st.windowIndex + 1) % st.brain.t_s.length;
          setWindowIndex(next);
        }
      }

      // repaint when the window OR the condition (brain) changed — switching
      // condition while parked on window 0 still needs a repaint
      if (st.windowIndex !== shownWindow || st.brain !== shownBrain) {
        shownWindow = st.windowIndex;
        shownBrain = st.brain;
        paintWindow(st.windowIndex);
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    // ── teardown: dispose all WebGL resources ──
    return () => {
      backdropCancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      geom.dispose();
      material.dispose();
      backdropGeom?.dispose();
      backdropMat?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, backdropUrl, paintWindow]);

  // current-window readouts for the caption / asymmetry callout
  const tNow = brain ? brain.t_s[windowIndex] ?? 0 : 0;
  const gfL = brain ? Math.round(brain.dnp01_L[windowIndex] ?? 0) : 0;
  const gfR = brain ? Math.round(brain.dnp01_R[windowIndex] ?? 0) : 0;
  const ready = !!positions && !!traces;

  return (
    <div className="cg-cc">
      <div className="cg-cc-head">
        <span className="cg-cc-eyebrow">the real circuit · pick a condition · scrub the escape</span>
        <div className="cg-cc-conds" role="group" aria-label="Choose a condition">
          {conditions.map((c) => (
            <button
              key={c.key}
              type="button"
              className="cg-pg-btn"
              data-active={c.key === condKey ? "1" : undefined}
              aria-pressed={c.key === condKey}
              onClick={() => setCondKey(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cg-cc-stage">
        <div className="cg-cc-canvas" ref={mountRef} aria-hidden="true" />

        {!ready && !error && <p className="cg-cc-status">loading the connectome…</p>}
        {error && (
          <p className="cg-cc-status cg-cc-status-err">
            couldn&apos;t render the point cloud (no WebGL, or the data failed to load) — the schematic
            map above carries the same circuit.
          </p>
        )}

        {/* a11y: the canvas is decorative; this carries the live state to screen readers */}
        <p className="cg-sr-only" role="status" aria-live="polite">
          {ready
            ? `${cond?.label}. Window at ${tNow.toFixed(2)} seconds. Left Giant Fiber ${gfL} hertz, right Giant Fiber ${gfR} hertz.`
            : "loading"}
        </p>

        {/* legend */}
        <div className="cg-cc-legend" aria-hidden="true">
          <span className="cg-cc-key">
            <span className="cg-cc-dot" style={{ background: "#E89B3D" }} /> LC4 / LPLC2 — looming detectors
          </span>
          <span className="cg-cc-key">
            <span className="cg-cc-dot" style={{ background: "#F8D26B" }} /> DNp01 — the Giant Fiber
          </span>
          <span className="cg-cc-key cg-cc-key-rest">
            <span className="cg-cc-dot" style={{ background: "#2f5b5e" }} /> at rest (quiet)
          </span>
        </div>
      </div>

      {/* timeline scrubber + transport */}
      <div className="cg-cc-controls">
        <button
          type="button"
          className="cg-pg-btn cg-cc-play"
          aria-pressed={playing}
          disabled={!ready || nWindows === 0}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "❚❚ pause" : "▶ play"}
        </button>
        <input
          className="cg-cc-scrub"
          type="range"
          min={0}
          max={Math.max(0, nWindows - 1)}
          value={Math.min(windowIndex, Math.max(0, nWindows - 1))}
          disabled={!ready || nWindows === 0}
          aria-label="Scrub the escape timeline"
          onChange={(e) => {
            setPlaying(false);
            setWindowIndex(Number(e.target.value));
          }}
        />
        <span className="cg-cc-readout" aria-hidden="true">
          t = {tNow.toFixed(2)}s
        </span>
      </div>

      {/* the asymmetry callout — the live L/R Giant-Fiber split for this window */}
      <div className="cg-cc-asym" aria-hidden="true" data-firing={gfL > 0 || gfR > 0 ? "1" : undefined}>
        <span className="cg-cc-asym-lab">Giant Fiber, this window</span>
        <span className="cg-cc-asym-pair">
          <span className="cg-cc-asym-cell">
            L <strong>{gfL}</strong> Hz
          </span>
          <span className="cg-cc-asym-cell" data-strong={gfR > gfL ? "1" : undefined}>
            R <strong>{gfR}</strong> Hz
          </span>
        </span>
      </div>

      <p className="cg-cc-cap">
        The same <strong>316 neurons</strong> as the map above — {positions?.counts.LC4 ?? 104} LC4 +{" "}
        {positions?.counts.LPLC2 ?? 210} LPLC2 → {positions?.counts.DNp01 ?? 2} DNp01 — but at their{" "}
        <strong>real FlyWire {positions?.flywire_release ?? "v783"} positions</strong>, lit by the{" "}
        <strong>actual LIF activity we computed</strong> (the per-window <code>hz_L/R</code> drive and{" "}
        <code>dnp01_L/R</code> Giant-Fiber rate), not predicted or decorative. Resting is cool and dim; a
        loom warms the threat side&apos;s detectors to amber and blooms <strong>DNp01 gold</strong>;
        baseline stays dark (the Giant Fiber is silent → the fly just walks). Drag to orbit. The dim
        full-brain backdrop is a flagged follow-up — this is the circuit only.
      </p>
      <p className="cg-cc-honest">
        Real FlyWire {positions?.coordinate_frame ?? "FAFB-v14.1"} coordinates (annotation positions, not
        a neuropil mesh) · only the 316 computed neurons light up · the ~139k full-brain backdrop is not
        in this bundle (wave-2 add).
      </p>
    </div>
  );
}

export default ConnectomeCloud;
