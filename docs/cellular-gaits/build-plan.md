# Cellular Gaits — redesign build plan (living doc)

> **Living document.** This is the source of truth for the `/projects/cellular-gaits`
> redesign. The on-site diagrams are `components/cellular-gaits/BuildPlanDAG.tsx`
> (this build plan) and `components/cellular-gaits/SystemDiagram.tsx` (the system
> design) and they must stay in sync with the tables below. When the plan changes,
> edit **all** of them.
>
> Last updated: 2026-06-20 (N-B done — navigation scaffold + the seek-vs-avoid arbitration visual `FeelerField` at `/behaviors/navigation`; hub flipped queued → building)

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
| E4 | Motor mapping tab | portfolio | 3 | B, C | done |
| E5 | Objective tab (reweight fitness) | portfolio | 3 | B, C, D | done |
| E6 | Optimizer tab (toy search + real curve) | portfolio | 3 | C, D | done |
| E7 | Embodied connectome tab (Eon direction) | portfolio | 3 | C | done |
| F | Integrate + verify (cross-links, index frame, perf, build green) | portfolio | 4 | all E | done |
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

## Campaign 2 — behaviors group (closing the loop)

The redesign shipped the open-loop walking reference. Campaign 2 closes the sensory loop and
builds the **Behaviors** group on top of it (new routes under `/projects/cellular-gaits/behaviors/*`),
starting with perturbation/robustness. See `docs/cellular-gaits/research-roadmap.md` for the science.
Boxes in a wave run in parallel.

| ID | Prompt | Repo | Wave | Depends on | Status |
|----|--------|------|------|-----------|--------|
| C2-A | Closed-loop controller + perturbation training (sensors → grid, re-evolve) | cellular-gaits | C2·1 | redesign | done |
| C2-B | Behaviors tab group + closed-loop visuals (scaffold, content/visuals only) | portfolio | C2·1 | redesign | done |
| C2-C | Wire C2-A's trained controller + open/closed recovery clips into `/behaviors/perturbation` | portfolio | C2·2 | C2-A, C2-B | done |
| CH-A | Closed-loop **chemotaxis** controller (bilateral odor → grid, warm-start from C2-A, re-evolve 3 azimuths) | cellular-gaits | CH·1 | C2-A | done |
| CH-B | Chemotaxis behavior tab scaffold + `GradientField` visual (content/visuals only, no trained data) | portfolio | CH·1 | C2-B | done |
| CH-C | Wire CH-A's trained controller + recorded approach clips + trajectory viz into `/behaviors/chemotaxis` | portfolio | CH·2 | CH-A, CH-B | done |
| R | Fly-page review (fix garbled/clipped diagrams, de-dup walking clip, fly-direct visuals) | portfolio | C2·3 | all C2/CH | done |

- **C2-A and C2-B run in parallel** — C2-B is content + visuals only, no trained data, so it
  doesn't block on the compute job. The chemotaxis wave (CH-*) mirrors the same split and
  warm-starts off the closed-loop walker from C2-A.
- **C2-B delivers:** the `/behaviors` hub + `/behaviors/perturbation` scaffold, `ClosedLoopDiagram`
  (open dashed → closed solid, before/after) and `SensorChannels` (42 joint angles + 6 foot
  contacts → grid), and the Sensing-tab / `SystemDiagram` reframe (the dashed feedback arc is now
  labelled *open-loop today → closing now*, linking the perturbation tab). The live closed-loop
  FlyStage + recovery clips are a marked placeholder that **C2-C** fills.

## Changelog

- **2026-06-20** — **Campaign 2 consolidated.** The perturbation + chemotaxis waves and the
  fly-page review — which the wave agents had left uncommitted in a shared working tree — were
  reconciled onto a single branch, `feat/cg-campaign2`, building green under Turbopack. The
  Campaign 2 status table above now reflects reality: C2-A/C2-C **done**, the chemotaxis wave
  (CH-A/CH-B/CH-C) **done**, and the fly-page review (**R**) **done**. No code change in this
  step beyond doc reconciliation; it groups the already-landed work into one coherent commit.
- **2026-06-19** — **R done — fly-page review.** Pass over the redesign + behaviors pages:
  fixed garbled/clipped diagrams, de-duplicated the walking clip, and added fly-direct visuals.
- **2026-06-18** — **C2-B done — Behaviors group scaffolded.** New routes under
  `/projects/cellular-gaits/behaviors/`: a **hub** (closed-loop framing + one card per roadmap
  behavior — perturbation *live soon*, chemotaxis / escape / navigation *queued*) and the
  **`/behaviors/perturbation`** scaffold (`ConceptScaffold` four-part reframed to sense · reward ·
  expectation · connectome-link, plus a clearly-marked `// TODO: C2-C` placeholder for the live
  closed-loop FlyStage + open/closed recovery clips). Two standalone, data-free visuals in the
  SystemDiagram house style: **`ClosedLoopDiagram`** (interactive before/after — the proprioceptive
  arc dashed/open vs solid/closed, each block reveals its one-liner on hover·tap·focus, keyboard +
  `aria`, edge-aware popout) and **`SensorChannels`** (the 48-signal proprioceptive bus → grid, with
  a keyboard-operable toggle between *extra channels* and *sensor cells*; counts real, mapping
  schematic until `closed_loop_controller.json`). Added the **Behaviors** tab to `tabs.ts`/`CgTabNav`
  (nested-route active matching). The dashed arc finally closes in the framing: **Sensing tab** +
  **`SystemDiagram`** reframed *open-loop today → closing now* with links to the perturbation tab
  (kept honest — the arc stays dashed since the loop isn't wired until C2-A/C2-C). `ConceptScaffold`
  widened with an optional `explainerParts` prop (backward-compatible). No three.js/wasm on the new
  content routes. Build green under Turbopack; 375px clean. Branch `feat/c2-behaviors-scaffold`,
  not merged.
- **2026-06-18** — **F done — redesign integrated.** Merged all seven tab branches
  (`feat/cg-e1-body` … `feat/cg-e7-embodied`) into `feat/cg-redesign`. Conflicts were the
  concurrent appends to `app/globals.css` (unioned — every tab's `.cg-*` block kept, none
  duplicated a selector) and this changelog/status table (hand-merged into one table, every
  A–G + E1–E7 + F row `done`, one concatenated changelog). Kept the widened
  `ConceptScaffold` `lead: ReactNode` prop (E2; backward-compatible). **Dropped E4's
  out-of-scope edit to `app/dashboard/login/page.tsx`** — the integrated tree builds green
  under Turbopack with the base (sync `searchParams`) version, so the async migration the E
  worktrees chased was an artifact of their symlinked-`node_modules` Turbopack panic, not a
  real error here. `npm run build` is **green under Turbopack** (the default), all eight
  cellular-gaits routes prerender. Polish: tightened the index frame, cross-linked the tabs
  (controller↔objective gain-sweep, sensing↔embodied closed-loop, every tab→appendix), and
  confirmed three.js + MuJoCo-wasm stay lazy on the physics tabs only.
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
- **2026-06-18** — **E6 done.** Optimizer tab filled. Two-piece module: (1) a live,
  in-browser **toy CMA-ES** — a faithful 2-D port of the real algorithm (weighted
  recombination + rank-one/rank-μ covariance update + CSA) on a tilted ill-conditioned
  quadratic, with play/step/reset; clearly labelled a toy, not the fly run. (2) the
  **real evolution curve**, rendered statically (SSR) from D's precomputed
  `evolution.json` — best/mean/±σ over 53 steps with the **original→resumed** phase split
  annotated (warm-start from the gen-35 checkpoint beat a prematurely-converged ~62 mm up
  to 86.6 mm). No live CMA-ES / fitness recompute. ConceptScaffold's four parts filled with
  real constants (pop 32, σ₀ 0.3, 50 gens, 660 params; alternatives RL / MJX-Brax /
  MAP-Elites; frontier = QD gallery). New: `ToyCmaEs.tsx`, `OptimizerModule.tsx`, `cg-opt-*`
  styles. tsc clean for the route; readable at 375px.
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
- **2026-06-18** — **E4 done.** `/mapping` filled (`components/cellular-gaits/MotorMap.tsx`): the
  cell↔joint wiring made concrete. Two synced, bidirectional surfaces — the 8×8 grid (top-left
  **7×6** = 42 motor cells numbered with their actuator index `i = r·6 + c`, the other 22 channel-0
  cells dimmed) and a top-down schematic fly (6 legs × 7 joints) — hover/focus either side lights up
  the matching element on the other; the deliberate decorrelation between grid position and which leg
  moves is the teaching point (it's a wiring convenience, nothing biological). Readout traces
  `s₀[r,c] → u[i] → joint` using the **real `model/manifest.json` actuator order** (fetched), and shows
  the rescale `clip(u,−1,1)·3.14 rad`. Beside it a live `<FlyStage>` driven by the evolved NCA
  (`lib/nca.ts`); pin a joint + "override on live fly" clamps that single target (`u[i]` slider, shown
  in rad) while the other 41 keep walking — live MuJoCo, `clip_gain_native.mp4` fallback. Keyboard/aria
  throughout (SVG `role=button`, `aria-pressed`, focus-visible rings), clean at 375px (single-column,
  no overflow), no console errors. ConceptScaffold's four parts filled with real constants
  (chose/why/alternatives/descending-neuron-readout frontier). Build green (see note below re: webpack).
  **Drive-by, out of E4 scope:** `app/dashboard/login/page.tsx` had a pre-existing Next 16 type error
  (sync `searchParams`, present on `feat/cg-redesign`) that blocked the type-check; fixed with the
  canonical `await searchParams` migration so the build is actually green. NB: this worktree's
  `node_modules` is a symlink out of root, which the **Turbopack** build rejects (`next build`); verified
  green with `next build --webpack` — an environment quirk of the worktree, not the app. F should
  confirm under Turbopack in the integrated tree.
- **2026-06-18** — **E5 done.** Filled the `/objective` tab. New `ObjectiveChart.tsx` (client
  island) plots D's **precomputed** `gain_sweep.json` — forward distance vs the gain knob,
  the same single-peak story framed as "this is what the chosen objective rewarded": native
  gain 1.0 marked amber (✦ 86.6 mm), the two-sided collapse drawn as red below-zero bars.
  Server-rendered `Math` formula above it (`F = Δx − 0.05·N_below`, `z_thr = 0.5 z_thorax`,
  post-warmup). A penalty toggle switches the bars/axis between distance and full fitness and
  exposes an honesty point baked into the data: **N_below = 0 at every sampled gain**, so the
  stability penalty never fired and fitness = distance here — surfaced explicitly rather than
  faked. Per-bar readout (distance / N_below / penalty / fitness) on hover + keyboard focus
  (`role=button`, `tabindex`, `aria-label`, `aria-live` readout, SVG `title`/`desc`).
  Four-part explainer filled with real constants; alternatives (energy, symmetry,
  speed-match, push-robustness, uprightness) and frontier (multi-objective / quality-diversity
  archive, Stage 3) named. Honesty constraint stated: visualizes the real objective, does not
  re-optimize for a new one. Verified rendering + interactivity via dev server + Playwright
  (0 console errors; toggle + readout confirmed); clean at 375px (no overflow). `tsc --noEmit`
  green and the cellular-gaits routes compile under `next build --webpack`; the repo-wide
  `npm run build` is blocked only by the worktree's `node_modules` symlink (Turbopack) and a
  pre-existing dashboard type error, both outside E5. New CSS under `.cg-obj-*` in globals.css.
- **2026-06-18** — **E7 done.** Filled the `/embodied` tab (the Eon on-ramp). New
  `ControllerLadder.tsx` — a themed signal-flow (reuses `SystemDiagram`'s SVG visual language +
  `.sysdiagram`/`.sysdiagram-pop` CSS) of the controller ladder: **NCA null model (today, live) →
  CPG → closed proprioceptive loop (Stage 2) → real FlyWire VNC connectome**, all swapped into
  **one fixed controller slot** driving **one fixed FlyGym body** — the green path (NCA → slot →
  body) marks what's live today, the rest is roadmap; each rung reveals a "what changes" popout on
  hover / tap / focus (keyboard-focusable, `Esc` to close, `aria`-described, edge-aware popout,
  clean at 375px). The existing native walking clip (`data/clip_gain_native.mp4`) is embedded as
  the "today" anchor. `ConceptScaffold` filled with all four parts (null model · structure →
  dynamics → behaviour · next rungs · the Eon frontier) plus a linked **references** list (Shiu
  et al. 2024, Lappalainen et al. 2024, Wang-Chen et al. 2024, Vaxenburg et al. 2025, the Eon
  embodied-fly write-up incl. the Loihi 2 / neuromorphic angle, and FlyWire). No new physics.
  Build green.
- **2026-06-19** — **C2-C done.** Wired the live closed loop into
  `/behaviors/perturbation`. `lib/nca.ts` gained the **6→16 closed-loop** path
  (`loadClosedLoop` + `stepClosedLoop` + `makeClosedLoopController`): conv1 takes
  4 recurrent state + 2 live sensor channels, built each control step from the
  exported `sensors` spec — ch4 = 42 joint angles (`actuator_length`, θ/3.14) on
  the 7×6 motor block, ch5 = 6 foot contacts on the bottom row; state stays 4
  channels, motor readout reused from v1 (`motor_cells`). Wiring pinned by a
  scratch verifier (shapes 16×6×3×3 / 4×16×1×1, finite/clamped, deterministic,
  sensors influence conv1). `lib/mujoco-fly.ts` gained `actuatorLengths()`,
  `footContacts()` (tarsus↔ground contact pairs → leg order lf,lm,lh,rf,rm,rh),
  `setThoraxForce`/`clearThoraxForce` (`xfrc_applied`) and a `headingDeg` metric.
  `FlyStage` got `shoveSignal`/`shoveMagnitude`/`shoveDurationS` (lateral impulse
  applied at control-step granularity over the pert window, fps-independent) and
  a `resetSignal` prop. New `PerturbationDemo` (one live stage, toggle v1
  open-loop ↔ trained closed-loop, shove button, live readout, recorded-clip
  fallback). The page (server) reads `robustness_metrics.json` via fs (sanitizing
  bare `Infinity`) and renders the recorded open/closed clips + a server-rendered
  `HeadingError` SVG (56.6°→26.5° mean, seed-202 97°→19° callout). `SensorChannels`
  refined to the real spec; `ClosedLoopDiagram`/`SystemDiagram`/Sensing copy
  updated (loop closed *for perturbation*, v1 walk still open-loop — kept honest).
  **Honesty:** at magnitude 6 neither controller falls (both 100% upright) — the
  win is course correction / disturbance rejection, not catching a fall; the
  closed-loop fitness scalar (69.97) is *not* compared to v1's 86.6 (different
  objective). three.js/WASM load only on this route (dynamic, `ssr:false`).
- **2026-06-19** — **CH-B done.** Stood up the **chemotaxis** behavior tab —
  content + visuals only, **no trained data**, so it runs in parallel with CH-A
  (trains the controller) and CH-C (wires the live demo). New route
  `app/projects/cellular-gaits/behaviors/chemotaxis/page.tsx` reusing the
  `ConceptScaffold` shell with the Behaviors four-part framing (sense = bilateral
  odor gradient, L vs R antenna; reward = reduce distance to / reach the source;
  expectation = steering **emerges** from the `cL − cR` asymmetry, no hard-coded
  turn; connectome link = insect tropotaxis / Eon's foraging demo). Registered in
  the Behaviors hub (`behaviors/page.tsx`: chemotaxis card `queued → building`,
  now linked). New **`GradientField.tsx`** is the key standalone visual and has
  **no data dependency**: a top-down odor field (analytic Gaussian bump → SVG
  `radialGradient` heatmap + dashed contour rings) with a draggable source, the
  fly with two antennae sampling `cL` vs `cR`, and an explicit `cL − cR → turn`
  readout (per-antenna bars, the signed difference, and the implied turn
  left/straight/right). Interactive in the house style (drag the source or grab
  the fly's nose to rotate its heading; the turn flips live), keyboard-accessible
  (both handles focusable; arrow keys move the source / rotate the fly; Shift =
  bigger step) with an `aria-live` readout + SVG `title`/`desc`; reuses the
  `SystemDiagram`/`HeadingError` SVG language (`var(--mono)`, site green/amber).
  The live trained demo is a **placeholder slot** carrying the exact CH-C TODO
  (live `place-the-source` FlyStage + recorded approach clips + top-down
  trajectory viz). New CSS under `.cg-chemo` / `.cg-grad-*` in globals.css; clean
  at 375px. **No three.js / WASM on this content route yet** — the page imports
  only `ConceptScaffold` + the pure-SVG `GradientField`. `npm run build` green
  (Turbopack). **Notes:** behavior sub-routes are not top-level `tabs.ts` entries
  by existing convention (perturbation isn't either — `CgTabNav` keeps the
  "Behaviors" tab active for nested routes and the hub's `BEHAVIORS` array is the
  real registry), so CH-B registers chemotaxis there rather than adding an
  inconsistent top tab. CH-A will export the trained chemotaxis controller +
  metrics; CH-C wires the live FlyStage + clips + trajectory into this scaffold.
- **2026-06-19** — **CH-C done.** Wired the **live chemotaxis demo** + the
  guaranteed recorded headline into `/behaviors/chemotaxis`, on top of CH-B's
  scaffold and CH-A's trained data (`public/cellular-gaits/data-ch/`). The page
  (server) reads `chemotaxis_metrics.json` + `trajectories.json` via fs and
  renders, with **no client JS for the headline**: the two recorded approach
  clips (`approach_left.mp4` / `approach_right.mp4` — same controller, opposite
  emergent turns) and a new server-rendered **`ChemoTrajectories.tsx`** SVG (the
  three trained rollouts top-down, each path curving to its source, source +
  dashed reach ring marked, closest-approach annotated; house green/amber, uniform
  world→screen scale so the reach rings stay circular). Numbers are pulled from
  the metrics JSON, never hardcoded (reaches the source on **3/3** trained
  azimuths — ahead 0.36, left 2.02, right 0.52). The interactive cherry is
  **`ChemotaxisDemo.tsx`** (`"use client"`, dynamic `FlyStage`, `ssr:false`): one
  live MuJoCo fly running the trained controller + a fly-centred top-down `<canvas>`
  arena where you **drag the food source** (pointer + click-to-place + keyboard
  arrow nudge, focusable handle with an `aria-live` cL/cR readout). Each control
  step the loop reads thorax xy + yaw from the sim (new public
  `FlySim.thoraxYaw()`), places the two antennae per the export's geometry
  (forward 1.0, lateral 2.0), evaluates `C(p)=exp(−‖p−src‖/λ)` (λ=12) at each
  antenna against the draggable source, and feeds `cL`/`cR` in — the turn is
  emergent. `lib/nca.ts` gained the **8→16 chemo architecture** (`loadChemo`,
  `stepChemo`, `makeChemoController(angles, contacts, cL, cR)`, plus
  `odorConcentration` / `antennaPositions` helpers); it reads the export's
  `sensors` spec for the topographic chemo layout (odor_left → motor-block cols
  0–2, odor_right → cols 3–5) and lifts the antenna geometry + λ from the JSON
  (data-driven, not hardcoded). **Honesty (reflected in copy):** the 2.0-unit
  antenna baseline is deliberately wider than biological — it stands in for the
  temporal "casting" a real fly uses; only **0/90/270** were trained (**180°
  behind is out of scope**); fitness is **closest-approach** (documented deviation
  from literal `d_end`); the fitness scalar is **not** compared across behaviors.
  Behaviors hub: chemotaxis `building → live`. three.js/WASM load only on this
  route (dynamic). Clean at 375px; keyboard/aria on the source control. `npm run
  build` green (Turbopack).
- **2026-06-20** — **X-B done (escape scaffold + the connectome-bridge visual).**
  Stood up `/behaviors/escape` and its centerpiece, the most connectome-forward
  diagram on the site yet. New **`EscapeCircuit.tsx`** (`"use client"`, pure SVG,
  **no three.js/WASM** — content route) draws the *real* Drosophila escape circuit
  as the amber backbone — looming → **LC4** (angular velocity) + **LPLC2** (angular
  size) → **Giant Fiber / DNp01** (sums size + velocity; single-spike timing →
  short vs long takeoff) → motor / takeoff — and maps our hand-built stand-in (the
  green rail) onto it: two bilateral loom channels ↔ LC4 + LPLC2, the learned NCA
  controller ↔ the descending readout, joined by dashed `↔` mapping arrows. A
  dashed band on the LC→DNp01 edge is the endgame seam, labelled verbatim *"the
  real FlyWire LC4/LPLC2 → DNp01 wiring drops in HERE."* Reuses the
  `SystemDiagram`/`ClosedLoopDiagram` house style + popout interaction (hover · tap
  · focus reveals each part's one-line role; 8 focusable parts, `role="button"` +
  aria-label + Esc-to-dismiss; pop variants real→amber, ours→green, seam→dashed).
  The route is `ConceptScaffold` four-part (sense = bilateral looming · reward =
  flee fast in the right direction · result = direction emerges from the L/R
  looming asymmetry · connectome link = the real circuit), cites Ache et al. 2019 /
  von Reyn et al. 2017, with a placeholder module slot for the live demo
  (`// TODO: X-C — live launch-the-threat escape FlyStage + flee clips + trajectory
  viz`). Behaviors hub: escape `queued → building` (href + "live soon"). **X-A**
  (trains the escape controller) and **X-C** (wires the live demo) are the
  remaining waves. Clean at 375px (0px overflow); keyboard/aria verified on the
  circuit; zero console errors; `npm run build` green (Turbopack).
- **2026-06-20** — **X-C done (escape goes live).** Wired X-A's trained controller +
  the recorded headline into `/behaviors/escape`, replacing X-B's placeholder slot
  (`cg-tab-module-stub`). The route now reads `escape_metrics.json` + `trajectories.json`
  server-side and renders, with **no client JS for the headline**: the two recorded flee
  clips (`flee_left.mp4` / `flee_right.mp4` — same controller, opposite emergent bolts) and
  a new server-rendered **`EscapeTrajectories.tsx`** (pure SVG small multiples — the recorded
  rollouts top-down, **trained {0,90,270}** separated from **held-out {45,135,315}** to show
  the generalization; each panel draws the fly bolt, the threat's incoming course with nulls
  skipped, the target-leading aim point + hit-radius ring, the onset marker, and
  escaped/closest/away-turn, all from the JSON). The interactive cherry is **`EscapeDemo.tsx`**
  (`"use client"`, dynamic `FlyStage`, `ssr:false`): one live MuJoCo fly running the trained
  controller, azimuth buttons (front/left/right) + click-in-arena to launch from any bearing,
  a constant-velocity **target-leading** threat, a fly-centred top-down `<canvas>` arena, and a
  bilateral `loom_L`/`loom_R` readout with an `aria-live` status (idle/incoming/hit/escaped) +
  NaN self-heal + a `flee_left.mp4` fallback. `lib/nca.ts` gained the **escape path** (additive;
  all four existing controllers intact): `loadEscape`, the pure `loomSignal` front-end ported
  verbatim from the export's `sensors.loom_geometry`/`eye_projection`, `stepEscape` (the chemo
  step with the two **amplified** loom planes), and `makeEscapeController(angles, contacts,
  loomL, loomR)`; it lifts the loom geometry + `loom_input_gain` from the export so the loop is
  data-driven (the demo passes the authoritative gain from the metrics config). **A/B confirmed
  bit-exact** (scratch check, then removed): the 8-channel pass with both loom planes zeroed
  equals the 6-channel closed-loop pass on the same conv1 weights — max abs diff = 0, so
  loom-zeroed reproduces the C2-A dynamics exactly. **Honesty surfaced (not buried):** the
  looming front-end is hand-built (the seam for the real LC4/LPLC2→DNp01 swap), `loom_input_gain=8`
  amplifies the [0,1] cue before the bang-bang conv1 (A/B-preserving), **180° behind is omitted**,
  and the escape fitness scalar is **not** cross-comparable. Behaviors hub: escape `building → live`.
  three.js/WASM load only on this route (dynamic). Clean at 375px; `npx tsc --noEmit` +
  `npm run build` green (Turbopack).
- **2026-06-20** — **N-B done (navigation scaffold + the seek-vs-avoid arbitration visual).**
  Stood up `/behaviors/navigation` — the **synthesis** behavior (seek a goal **and** avoid
  obstacles). Centerpiece is new **`FeelerField.tsx`** (`"use client"`, pure SVG, **no
  three.js/WASM** — content route): a top-down schematic of the fly with the **odor goal beacon**
  ahead (the chemotaxis cue, reused), a **wall** in the path, and two bilateral **feeler fans**
  (short-range obstacle proximity, left field vs right). The geometry is **analytic and
  deterministic** — the feeler readings are real ray–circle casts against the wall and the
  vectors are their true sums, not artwork — so it renders the same with or without a trained
  controller. It draws the two emergent drives as vectors: a **seek** vector (amber, from the
  odor `L−R` asymmetry, toward the goal) and an **avoid** vector (red, from the feeler `L−R`
  asymmetry, away from the wall), summed into the resolved **detour** heading (green) that bends
  around the obstacle while still carrying to the goal. The *arbitration* is the intellectual
  content, made legible by a two-drives readout (proxL/proxR bars + the `seek ⊕ avoid → detour`
  line). Reuses the `EscapeCircuit`/`SystemDiagram` popout interaction (hover · tap · focus →
  each part's one-line role; 8 focusable parts — goal, obstacle, L/R feeler fans, seek/avoid/detour
  vectors, fly — `role="button"` + aria-label + Esc-to-dismiss; pop variants amber/green/dashed),
  `role="img"` + `<title>`/`<desc>` on the SVG. The route is `ConceptScaffold` four-part (sense =
  bilateral feelers + reused odor beacon · reward = reach goal, penalize collisions · result =
  detour direction emerges from the feeler `L−R` asymmetry, **warm-started from the chemo forager**
  so feelers-off == the pure forager that walks into walls · connectome link = **the honest
  no-clean-seam framing**), with a placeholder module slot for the live demo
  (`// TODO: N-C — live place-the-goal / drag-the-obstacles FlyStage + detour clips + trajectory viz`,
  `cg-tab-module-stub`). **Crucial honesty (surfaced, not buried):** unlike escape, navigation has
  **no clean real-circuit seam** — real flies avoid obstacles with **vision / optic flow**, not
  feeler rays; the feeler front-end is a **robotics rangefinder abstraction**, contrasted explicitly
  with escape's real LC4/LPLC2→DNp01 seam so the site stays calibrated. No fake circuit diagram for
  navigation. Behaviors hub: navigation `queued → building` (href + "live soon"). **N-A** trains the
  navigation controller, **N-C** wires the live place-the-goal / drag-the-obstacles demo into the
  placeholder slot. Clean at 375px; zero console errors; `npx tsc --noEmit` + `npm run build` green
  (Turbopack).
