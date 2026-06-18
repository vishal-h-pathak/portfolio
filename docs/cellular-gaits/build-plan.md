# Cellular Gaits — redesign build plan (living doc)

> **Living document.** This is the source of truth for the `/projects/cellular-gaits`
> redesign. The on-site diagram is `components/cellular-gaits/BuildPlanDAG.tsx` and it
> must stay in sync with the status table below. When the plan changes, edit **both**.
>
> Last updated: 2026-06-18 (C landed)

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
| D | Precompute rollouts (gain→gait sweep, open/closed clips, evolution curve, CPG baseline) | cellular-gaits | 1 | — | planned |
| B | MuJoCo-WASM substrate (`<FlyStage>`, spike + perf validation) | portfolio | 2 | A | planned |
| E1 | Body tab | portfolio | 3 | B, C | planned |
| E2 | Controller tab (criticality playground + rule swap) | portfolio | 3 | B, C | planned |
| E3 | Sensing tab (open vs closed loop) | portfolio | 3 | B, C, D | planned |
| E4 | Motor mapping tab | portfolio | 3 | B, C | planned |
| E5 | Objective tab (reweight fitness) | portfolio | 3 | B, C, D | planned |
| E6 | Optimizer tab (toy search + real curve) | portfolio | 3 | C, D | planned |
| E7 | Embodied connectome tab (Eon direction) | portfolio | 3 | C | planned |
| F | Integrate + verify (cross-links, index frame, perf, build green) | portfolio | 4 | all E | planned |

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

- **2026-06-18** — Initial plan. Architecture set (MuJoCo-WASM, sub-routes, math
  appendix, story removed). Decomposed into prompts A–F; diagram + this doc created and
  surfaced in the page appendix.
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
