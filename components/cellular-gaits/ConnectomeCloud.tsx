"use client";

/**
 * <ConnectomeCloud> — the real escape circuit, in real 3-D space, lighting up
 * (The Embodied Fly, R2-WP4 / WP4b). The honest, anatomical counterpart to the
 * schematic <BrainCircuitMap>: the **316 actual escape-circuit neurons at their
 * measured FlyWire v783 positions** (104 LC4 + 210 LPLC2 + 2 DNp01) as a
 * Three.js point cloud, lit by the **real per-window LIF firing activity we
 * already computed** (the `data-eb` traces) — not predicted/decorative.
 *
 *   resting        → cool + dim (teal lobula, violet Giant Fiber)
 *   looming threat → the threat-side LC4/LPLC2 warm up to amber (brain.hz_L/hz_R)
 *   DNp01 fires    → the Giant Fiber blooms warm gold (brain.dnp01_L/dnp01_R)
 *   baseline       → stays dark (GF silent → the fly merely walks)
 *
 * WP4b note: this is now a **controlled renderer**. It owns only the WebGL scene
 * (build, paint, orbit, dispose); the condition toggle, the synced play/scrub
 * timeline, and the data fetch live in the parent <SimultaneousEscape>, which
 * drives the cloud and the fly clip from one shared clock. The cloud repaints
 * whenever `brain` / `windowIndex` change.
 *
 * Honest: only the neurons we actually computed light up. The dim full-brain
 * ~139k backdrop (Eon's exact look) is NOT in positions.json (that is the
 * 316-circuit only) — there is a clean hook for it (`backdropUrl`), still a
 * flagged cellular-gaits follow-up (wave 2). It is not built here.
 *
 * Perf/mobile: 316 points is trivial; WebGL is disposed on unmount, auto-rotate
 * honours prefers-reduced-motion, and a missing-WebGL path degrades to a note.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ── palette (matches the site tokens used across the escape pages) ──
const DETECTOR_REST = new THREE.Color(0.11, 0.34, 0.38); // dim teal — the lobula detectors at rest
const DETECTOR_HOT = new THREE.Color(0.91, 0.61, 0.24); // #E89B3D amber — the real circuit, firing
const GF_REST = new THREE.Color(0.3, 0.18, 0.44); // dim violet — the Giant Fiber at rest
const GF_HOT = new THREE.Color(0.98, 0.82, 0.42); // warm gold — DNp01 firing (blooms toward white)
const GF_WHITE = new THREE.Color(1.0, 0.97, 0.86);

export type Neuron = {
  id: number;
  type: "LC4" | "LPLC2" | "DNp01";
  hemisphere: "left" | "right";
  x: number;
  y: number;
  z: number;
};
export type Positions = {
  flywire_release?: string;
  coordinate_frame?: string;
  counts: { LC4: number; LPLC2: number; DNp01: number };
  n_neurons: number;
  neurons: Neuron[];
};
export type Brain = {
  t_s: number[];
  hz_L: number[];
  hz_R: number[];
  dnp01_L: number[];
  dnp01_R: number[];
  dnp01_mean: number[];
};

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth(t: number) {
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

type SceneHandle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;
  geom: THREE.BufferGeometry;
  colorAttr: THREE.BufferAttribute;
  sizeAttr: THREE.BufferAttribute;
  intensityAttr: THREE.BufferAttribute;
  material: THREE.ShaderMaterial;
};

export function ConnectomeCloud({
  positions,
  brain,
  windowIndex,
  hzRef,
  gfRef,
  backdropUrl,
}: {
  positions: Positions | null;
  brain: Brain | null;
  windowIndex: number;
  hzRef: number;
  gfRef: number;
  backdropUrl?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  // repaint the cloud for the current (brain, window)
  const paint = useCallback(() => {
    const s = sceneRef.current;
    if (!s || !positions || !brain) return;
    const N = positions.neurons.length;
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const n = positions.neurons[i];
      const a = activityFor(n, brain, windowIndex, hzRef, gfRef);
      const e = smooth(a);
      const isGF = n.type === "DNp01";
      if (isGF) {
        c.copy(GF_REST).lerp(GF_HOT, e);
        if (e > 0.6) c.lerp(GF_WHITE, ((e - 0.6) / 0.4) * 0.5);
      } else {
        c.copy(DETECTOR_REST).lerp(DETECTOR_HOT, e);
      }
      s.colorAttr.setXYZ(i, c.r, c.g, c.b);
      s.intensityAttr.setX(i, e);
      const base = isGF ? 0.85 : 0.5;
      s.sizeAttr.setX(i, base + e * (isGF ? 1.5 : 1.0));
    }
    s.colorAttr.needsUpdate = true;
    s.intensityAttr.needsUpdate = true;
    s.sizeAttr.needsUpdate = true;
  }, [positions, brain, windowIndex, hzRef, gfRef]);

  // ── build the scene once positions are present ──
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
      const w = mount.clientWidth || 480;
      const h = Math.max(240, Math.round(w * 0.75)); // 4:3 — matches the bird's-eye clip
      return { w, h };
    };
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    renderer.setPixelRatio(dpr);
    const { w: w0, h: h0 } = getSize();
    renderer.setSize(w0, h0, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "auto";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w0 / h0, 0.1, 100);
    camera.position.set(0, 0, 3.6);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    // geometry: real XYZ, centred + scaled to fit; negate y (dorsal up) and z
    // (anterior faces the camera) for a clean anterior/dorsal default.
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
    const sc = 1.1 / half;

    const posArr = new Float32Array(N * 3);
    const colArr = new Float32Array(N * 3);
    const sizeArr = new Float32Array(N);
    const intenArr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const n = neurons[i];
      posArr[i * 3] = (n.x - cx) * sc;
      posArr[i * 3 + 1] = -(n.y - cy) * sc;
      posArr[i * 3 + 2] = -(n.z - cz) * sc;
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
      // uScale ∝ dpr so on-screen (CSS) point size is resolution-independent
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

    // ── optional dim full-brain backdrop layer (HOOK ONLY, wave-2 follow-up) ──
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
            ba[i * 3] = (px - cx) * sc;
            ba[i * 3 + 1] = -(py - cy) * sc;
            ba[i * 3 + 2] = -(pz - cz) * sc;
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

    sceneRef.current = {
      renderer,
      scene,
      camera,
      group,
      geom,
      colorAttr,
      sizeAttr,
      intensityAttr,
      material,
    };
    setReady(true);
    paint(); // initial paint at the current window

    // ── orbit: gentle auto-rotate + pointer drag (no extra deps) ──
    group.rotation.x = -0.32; // 3/4 anterior-dorsal tilt so depth reads
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let userInteracted = false;
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    const onResize = () => {
      const { w, h } = getSize();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      material.uniforms.uScale.value = dpr * 22;
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(mount);

    let raf = 0;
    let lastTime = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = lastTime ? t - lastTime : 16;
      lastTime = t;
      if (!dragging && !reduced) {
        group.rotation.y += (userInteracted ? 0.0006 : 0.0016) * dt;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

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
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, backdropUrl]);

  // repaint when the controlled inputs change
  useEffect(() => {
    if (ready) paint();
  }, [ready, paint]);

  return (
    <div className="cg-cc-canvaswrap">
      <div className="cg-cc-canvas" ref={mountRef} aria-hidden="true" />
      {!positions && !error && <p className="cg-cc-status">loading the connectome…</p>}
      {error && (
        <p className="cg-cc-status cg-cc-status-err">
          couldn&apos;t render the point cloud (no WebGL) — the schematic map above carries the same
          circuit.
        </p>
      )}
      <div className="cg-cc-legend" aria-hidden="true">
        <span className="cg-cc-key">
          <span className="cg-cc-dot" style={{ background: "#E89B3D" }} /> LC4 / LPLC2 — detectors
        </span>
        <span className="cg-cc-key">
          <span className="cg-cc-dot" style={{ background: "#F8D26B" }} /> DNp01 — Giant Fiber
        </span>
        <span className="cg-cc-key cg-cc-key-rest">
          <span className="cg-cc-dot" style={{ background: "#2f5b5e" }} /> at rest
        </span>
      </div>
    </div>
  );
}

export default ConnectomeCloud;
