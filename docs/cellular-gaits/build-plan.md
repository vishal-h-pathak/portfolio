# Cellular Gaits — redesign build plan (living doc)

> **Living document.** This is the source of truth for the `/projects/cellular-gaits`
> redesign. The on-site diagrams are `components/cellular-gaits/BuildPlanDAG.tsx`
> (this build plan) and `components/cellular-gaits/SystemDiagram.tsx` (the system
> design) and they must stay in sync with the tables below. When the plan changes,
> edit **all** of them.
>
> Last updated: 2026-06-18 (B landed — live physics validated)

## Goal

Turn the project page from a single first-pass page into a **tabbed technical reference**
for a reader who already knows what a connectome is. Each thing the project models —
the body, the controller, sensing, the motor mapping, the objective, the optimizer — is
its own **interactive** module that explains *what we chose, why, what the alternatives
are, and where the biological/frontier version sits*. The story-style narrative is
removed; an appendix holds all the math.

## Architecture decisions

- **Physics in the browser:** Google DeepMind ships official WebAssembly/TypeScript
  bindings for MuJoCo. FlyGym 2.0.1 builds the fly programmatically via `dm_control.mjcf`
  (no static MJCF dir), so prompt A flattens the compiled model with
  `export_with_assets`. The standalone bundle (`fly.xml` + 39 STL meshes + `manifest.json`,
  3.27 MB, MuJoCo 3.6.0) now lives at `portfolio/public/cellular-gaits/model/`. We load the
  real model into the real engine client-side and drive it with controllers ported to JS.
  Pyodide is *not* used (no maintained MuJoCo wheel; full FlyGym stack isn't
  browser-portable).
- **Heavy compute stays offline:** CMA-ES evolution, gain→gait sweeps, and
  perturbation-recovery runs are precomputed in real Python FlyGym and shipped as
  JSON/mp4 to scrub. "Interactive" = live WASM physics for short rollouts + real
  recorded data for the heavy stuff.
- **Navigation:** deep-linkable nested routes under `/projects/cellular-gaits/*`, one
  concept per route, with a shared tab nav + layout.
- **Math:** a dedicated `/appendix` route (KaTeX), carrying forward the existing
  equations. The `BuildPlanDAG` lives in the appendix too.
- **Open risk:** the fly model is ~87 joints with rich contacts. Real-time WASM in a
  browser tab is unproven for this model — **prompt B is a spike that must validate
  performance** before the wave-3 tabs commit to live physics. If it's too heavy,
  affected tabs fall back to recorded-real data (from prompt D), which is why D runs in
  parallel from the start as insurance.

## Build waves & status

Columns in the diagram are time; boxes in a column run in parallel.

| ID | Prompt | Repo | Wave | Depends on | Status |
|----|--------|------|------|-----------|--------|
| A | Export fly MJCF + assets | cellular-gaits | 1 | — | done |
| C | Route shell + nav + math appendix migration | portfolio | 1 | — | done |
| D | Precompute rollouts (gain→gait sweep, evolution curve, clips; open/closed + CPG deferred) | cellular-gaits | 1 | — | done |
| B | MuJoCo-WASM substrate (`<FlyStage>`, spike + perf validation) | portfolio | 2 | A | done |
| E1 | Body tab | portfolio | 3 | B, C | done |
| E2 | Controller tab (criticality playground + answered gain→gait result) | portfolio | 3 | B, C, D | done |
| E3 | Sensing tab (open vs closed loop) | portfolio | 3 | B, C, D | done |
| E4 | Motor mapping tab | portfolio | 3 | B, C | planned |
| E5 | Objective tab (reweight fitness) | portfolio | 3 | B, C, D | planned |
| E6 | Optimizer tab (toy search + real curve) | portfolio | 3 | C, D | planned |
| E7 | Embodied connectome tab (Eon direction) | portfolio | 3 | C | planned |
| F | Integrate + verify (cross-links, index frame, perf, build green) | portfolio | 4 | all E | planned |
| G | System-design diagram (appendix, hover-to-reveal model) | portfolio | — | C | done |

Status values: `planned` → `prompt-written` → `in-progress` → `done`.

## Parallelization

- **Wave 1:** launch A, C, D as separate CC sessions simultaneously.
- **Wave 2:** B after A (its MJCF output informs B's loader).
- **Wave 3:** E1–E7 in parallel once B + C are ready (E3/E5/E6 also need D). Up to ~7
  sessions at peak.
- **Wave 4:** F last, after all E tabs land.

## The bigger arc (beyond this redesign)

The NCA controller is a generic *null model*. The scientific payoff is replacing it with
progressively more biological controllers — CPG → closed proprioceptive loop → the real
VNC leg connectome from FlyWire as the controller — and asking whether real structure,
embodied, produces real behavior. This is the same line of work as Eon Systems' embodied
fly (FlyWire LIF brain + Lappalainen vision + NeuroMechFly body), and connects to the
neuromorphic angle (the FlyWire connectome on Loihi 2). The E7 tab is the on-ramp to
this; a future campaign is the build-out.

## Changelog

- **2026-06-18** — **E2 done.** Controller tab rebuilt on `ConceptScaffold` (four-part
  explainer, real constants). Kept the live `CriticalityPlayground` (it now reads as *posing*
  the criticality question), and added the **answered result**: a themed dual-axis SVG
  (`GainSweepChart`, house style — data-driven, `var(--mono)`, site palette) plotting distance
  (mm) and λ vs gain from D's `gain_sweep.json`, with the native gain 1.0 peak (86.6 mm) marked
  and the λ=0 crossing band (gain 1.3–1.5) highlighted. Copy flipped from "haven't run the
  physics yet" → the finding (peak at native; collapse coincides with chaos onset), detuning-
  sweep caveat kept. Added a recorded-rollout strip (`GaitClips`, D's lo/native/hi clips) + link
  to the live fly on the Body tab — a second live `<FlyStage>` was *not* embedded to protect the
  frame budget alongside the playground (precomputed-only, per the honesty rule). Build green
  (webpack; the Turbopack symlink panic + the pre-existing `dashboard/login` PageProps error are
  environment/base issues, not E2), 375px clean, 0 console errors.
- **2026-06-18** — Initial plan. Architecture set (MuJoCo-WASM, sub-routes, math
  appendix, story removed). Decomposed into prompts A–F; diagram + this doc created and
  surfaced in the page appendix.
- **2026-06-18** — **D done.** Added the `gain` knob to `nca.py` (verified `gain=1.0` is
  bit-for-bit identity; reproduces checkpoint fitness 86.61898). Ran the real gain→gait
  sweep through MuJoCo (9 gains). **Headline result:** walking distance is single-peaked at
  native gain 1.0 (86.6 mm) and collapses on both sides; the performance cliff coincides
  with λ crossing zero between gain 1.3 and 1.5 — i.e. the moment the CA tips into chaos the
  gait dissolves. CMA-ES parked the controller at λ≈−0.26, just inside the ordered side of
  the edge of chaos. This is the physics-side confirmation of the hypothesis the criticality
  playground only posed. Data copied to `public/cellular-gaits/data/` (`gain_sweep.json`,
  `evolution.json`, 3 clips). Deferred: open/closed perturbation (needs Stage 2), CPG
  baseline (needs a CPG controller).
- **2026-06-18** — **A done.** Fly model flattened (`export_with_assets`) into a standalone
  bundle and copied to `public/cellular-gaits/model/` (`fly.xml`, 39 STL meshes,
  `manifest.json`; 3.27 MB; MuJoCo 3.6.0). Verified: loads in vanilla MuJoCo, `nu==42`,
  actuator index order == `env.py` control order (JS writes `ctrl[0..41]` directly), 4000
  steps stable. Contact via 55 `<pair>`s; 6 contact sensors removed; `multiccd` kept (drop
  if WASM engine predates MuJoCo 3.x). Units = mm, gravity −9810. Unblocks B.
- **2026-06-18** — **C done.** `/projects/cellular-gaits` is now a tabbed, deep-linkable
  reference: shared `layout.tsx` + `CgTabNav` (active tab from pathname, mobile-scrollable),
  nine real routes (frame index, controller, six stub concept tabs via `ConceptScaffold`,
  appendix). Story `cg-writeup` removed; math + `BuildPlanDAG` migrated verbatim into
  `/appendix`. Hard facts from the old writeup salvaged into each stub's "what we chose".
  Stub tabs (body/sensing/mapping/objective/optimizer/embodied) carry `// TODO: wave 3`
  markers and the four-part explainer scaffold; E1–E7 now unblocked. Build green.
- **2026-06-18** — **G done.** Added `SystemDiagram.tsx`, a second appendix diagram
  (companion to `BuildPlanDAG`): an at-a-glance system-design block diagram of the two
  coupled loops — the runtime control loop (green: NCA controller → motor mapping → MuJoCo
  fly body, with a **dashed/planned** proprioceptive feedback arc through Sensing, honestly
  marked open-loop-today/closes-in-Stage-2) and the training loop (amber: body → fitness F
  → CMA-ES → θ back into the controller). Each of the six blocks reveals a popout with the
  real model (KaTeX via `Math`) on hover / tap / focus; keyboard-focusable, `Esc` to close,
  `aria` described, edge-aware popout positioning (never clipped, clean at 375px). Data-driven
  (BLOCKS/EDGES arrays), matches `BuildPlanDAG`'s SVG visual language. Wired into `/appendix`
  above the build plan. Constants sourced from `model/manifest.json` + nca.py/env.py/evolve.py.
  Build green.
- **2026-06-18** — **B done — spike PASSED, live physics is the wave-3 default.** Real MuJoCo
  in the browser via DeepMind's official `@mujoco/mujoco@3.9.0` (single-threaded), loading the
  prompt-A bundle and driven by the real evolved NCA. Perf on a normal laptop in Chrome:
  **12,422 `mj_step`/s → 310 control-steps/s → 1.24× real-time physics**, and **60 fps at
  0.995× real-time** for the full live loop (physics + three.js render) — well past the bar
  (≥30 fps, ≥0.25× real-time). Load ~0.5 s warm; ~13.4 MB transferred (9.1 MB wasm + 3.3 MB
  meshes + 0.6 MB three + glue), all **lazy** — verified against the build manifests that no
  route without a FlyStage pulls the engine or three.js, and the wasm binary is never bundled
  (served from `public/cellular-gaits/wasm/`, fetched at runtime). Deliverables: `lib/nca.ts`
  (shared controller, extracted from `CriticalityPlayground` which still behaves identically +
  passes `verify-controller.mjs`); `lib/mujoco-fly.ts` (engine/model plumbing, FS mount,
  contract-correct `ctrl` writes, geom render data); `components/cellular-gaits/FlyStage.tsx`
  (SSR-safe, dynamic-imported three+wasm, tracking camera, play/pause/reset, `onStep` metrics,
  optional `fallbackClipSrc`); the `/body` route now shows a real FlyStage demo (NCA walking
  the fly, live, distance/FPS readout). Full numbers in `docs/cellular-gaits/spike-B-perf.md`.
  Levers applied: per-rAF substep budget, shadows off, offscreen pause, DPR≤2 (LOD/mesh
  decimation not needed). MT/`SharedArrayBuffer` (COOP/COEP) noted as a future lever, not used.
  **Wave 3: E1/E3/E4 get LIVE physics** (recorded fallback available via `fallbackClipSrc` but
  not the default). Unblocks E1, E2, E3, E4.
- **2026-06-18** — **E1 done.** Body tab (`/projects/cellular-gaits/body`) filled. Interactive
  module is the real evolved NCA walking the real fly **live** in MuJoCo-WASM via `<FlyStage>`
  (default controller), with the stage's play/pause/reset plus a camera-tracking on/off toggle,
  a forward-distance / sim-time / FPS readout from `onStep`, and a recorded fallback
  (`clip_gain_native.mp4`) for weak devices. Added `components/cellular-gaits/PlantSchematic.tsx`
  — a themed SVG (house style: `var(--mono)`, site palette, data-driven, hover/tap/focus, `aria`,
  keyboard) labelling the plant: **42** position actuators = 7 DoF × 6 legs, ~**87** joints, from
  an X-ray microCT scan, units mm, control **250 Hz** with **40** physics substeps @ 10 kHz.
  Selecting any of the six legs reveals its 7-DoF kinematic chain (coxa yaw·pitch·roll →
  trochanter–femur pitch·roll → tibia → tarsus) and the exact 7 consecutive `u[i…j]` channels it
  drives (per-leg actuator offsets verified against `model/manifest.json`). The "highlight those
  joints on the live fly" extra was scoped out (would mean geom-highlight plumbing into the shared
  `<FlyStage>` — not cheap, and risks the other physics tabs). All four `ConceptScaffold` parts
  filled with real constants (chose: NeuroMechFly/FlyGym in MuJoCo; why: fixed testbed substrate;
  alternatives: Vaxenburg whole-body RL / generic hexapod / kinematic replay; frontier:
  NeuroMechFly v2 full sensorimotor body). Verified: live fly walks (~60 fps), leg selection maps
  correctly, **zero horizontal overflow at 375px**, 0 console errors, type-clean. Build note: the
  worktree's `node_modules` is a symlink out of root so Turbopack build panics (env, not code) —
  `next build --webpack` compiles E1 green; the only type error is a **pre-existing** unrelated
  `app/dashboard/login` async-`searchParams` issue (reproduced on a clean stashed tree).
- **2026-06-18** — **E3 done.** Filled the `/sensing` tab. Interactive module
  (`SensingModule.tsx`): the real evolved NCA walking the fly **live** via `<FlyStage>` —
  framed as **open-loop** (it *is* open-loop: the default controller never reads body state),
  with a "sensory feedback: none" readout and recorded native-gain rollout as the honest
  fallback (`clip_gain_native.mp4`). Below it, `SignalPathDiagram.tsx` — two side-by-side block
  diagrams in the SystemDiagram house style (green = wired forward path grid→motor-map→body;
  **dashed gray = planned**): open loop (today, no return arc) vs closed loop (Stage 2, the
  proprioceptive arc carrying joint angles + foot contacts back into the grid, drawn not-wired).
  The perturbation-recovery test is framed as the experiment that distinguishes the two and
  *why* open-loop can't pass it (no error signal to correct against) — explicitly **no live
  recovery demo and no faked numbers** (closed loop is Stage 2). Four-part `ConceptScaffold`
  filled with real constants (8×8×4 grid / 660 θ, 42 joints, 250 Hz, 86.6 mm native; sensors:
  campaniform sensilla / hair plates / chordotonal organs). 375px-clean (paths stack), keyboard/
  aria accessible (each path SVG `role="img"` titled+described). Build green. Don't-merge (F integrates).
