# Prompt B — MuJoCo-WASM substrate: spike perf report

**Date:** 2026-06-18 · **Branch:** `feat/cg-wasm-substrate` · **Verdict: PASS — ship live physics as the default.**

## What was measured

DeepMind's official single-threaded MuJoCo WASM engine (`@mujoco/mujoco@3.9.0`,
maintained by the MuJoCo team) loading the prompt-A fly bundle (`fly.xml` + 39 STL
meshes, MuJoCo 3.6.0 — forward-compatible with the 3.9 engine), driven by the real
evolved NCA from `lib/nca.ts`, rendered with three.js. Measured in Chrome on a
normal laptop (the dev machine), single-threaded (no `SharedArrayBuffer`).

Compiled model facts: **nq 133, nv 132, nu 42, nbody 71, ngeom 70, nmesh 69**, one
keyframe (`neutral`).

## Numbers

| Metric | Result | Bar | |
|---|---|---|---|
| Raw `mj_step` throughput | **12,422 steps/s** | — | |
| Control rate (40 `mj_step`/step) | **310 control-steps/s** | — | |
| Physics-only real-time fraction | **1.24×** | ≥ 0.25× | ✅ |
| **Live (physics + render) real-time** | **0.995×** | ≥ 0.25× | ✅ |
| **Render FPS** (live, NCA walking) | **60 fps** | ≥ ~30 | ✅ |
| Compile model (FS write + `from_xml_path`) | ~200 ms | — | |
| Engine instantiate | ~45 ms | — | |
| Total load (warm cache) | ~0.5 s | — | |

The fly genuinely walks: net displacement ~24 mm/s, consistent with the evolved
controller's 86.6 mm / 3 s fitness. Visual is correct — full body, eyes, six legs,
contacts on the ground grid, tracking camera.

## Transferred bytes (lazy, only when a FlyStage mounts)

| Asset | Size |
|---|---|
| `mujoco.wasm` (engine) | 9.14 MB |
| 39 STL meshes | 3.33 MB |
| `fly.xml` | 89 KB |
| `mujoco.js` (Emscripten glue) | 287 KB |
| three.js (async chunk) | ~0.6 MB |
| **Total** | **≈ 13.4 MB** |

Cold-cache load is dominated by this transfer (a few seconds on a typical
connection); the engine itself initialises in well under a second. Acceptable for
a lazily-loaded, opt-in interactive — it never touches a route that doesn't mount a
FlyStage.

## Levers applied (proactively, cheap-first)

- Fixed substep **budget per `requestAnimationFrame`** (`MAX_STEPS_PER_FRAME = 6`)
  with a wall-clock accumulator → tracks real time when it can, degrades smoothly
  (never spirals) when it can't.
- **Shadows off.**
- **Pause when offscreen** (IntersectionObserver) and when the controller is
  paused.
- DPR capped at 2.
- The headline lever was *not even needed* (LOD / mesh decimation / dropping
  cosmetic geoms): we hit 60 fps at ~1× real time as-is.

## Notes / future levers

- **Single-threaded only**, as instructed. The `/mt` threaded build needs
  `SharedArrayBuffer` → site-wide COOP/COEP cross-origin-isolation headers. Noted
  as a future lever; **not** enabled here.
- The Emscripten ESM glue has a Node-only `await import('module')` branch that
  bundlers choke on. We serve `mujoco.js` + `mujoco.wasm` from
  `public/cellular-gaits/wasm/` and load the glue via a bundler-invisible native
  `import()` (and pass the wasm as `wasmBinary`). Result: the engine is never
  bundled into any route, verified against the build manifests.
- **Browsers:** verified in Chrome. Firefox/Safari untested here but expected to
  work — the path needs only WebGL + WebAssembly + native dynamic `import()`, no
  `SharedArrayBuffer`.

## Call for wave 3

**E1 (Body), E3 (Sensing), E4 (Mapping) get LIVE physics**, not recorded fallback.
`<FlyStage>` exposes an optional `fallbackClipSrc` prop so any tab can still drop to
a D-recorded mp4 on a weak device, but live is the default and clears the bar
comfortably.
