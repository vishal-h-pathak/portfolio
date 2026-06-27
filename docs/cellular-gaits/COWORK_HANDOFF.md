# Cellular Gaits — Cowork session handoff

*Paste this whole file as the opening message of a new Cowork session. It is the ground truth for
where the project is and what to do next. Read the linked docs before acting.*

---

## What this project is

**Cellular Gaits** recreates, in miniature and honestly, **Eon Systems' embodied brain emulation**
(https://eon.systems/updates/embodied-brain-emulation): a *real* fly connectome run as a spiking
brain, driving a biomechanically real fly body in a physics sim, in a closed sensory-motor loop.

The four-part loop: **① sense** a looming threat → **② brain** (real FlyWire connectome as a LIF
spiking net) routes the spikes → **③ descend** (the Giant Fiber escape command neuron fires) →
**④ body** (NeuroMechFly bolts away) → movement changes what's seen → repeat.

The overarching goal Vishal set: **a report + simulation one can go through to fully understand every
design decision, why it was made, and build an intuitive feel for the simulation.** Earlier project
work (RL navigation, NCA controllers) was toys/demos and has been shipped honest and superseded — the
embodied escape loop on the *real* connectome is the real thing.

## Two repos (both on branch `feat/n-rl-navigation`, everything merged there)
- `~/dev/jarvis/cellular-gaits` — the compute half (brain, body, loop, the report + explainers).
- `~/dev/jarvis/portfolio` — the web half + all cross-machine planning docs under
  `docs/cellular-gaits/`. The web export bundle the site consumes lives in `portfolio/public/cellular-gaits/`.
- (`~/dev/jarvis/fleet-mission-control` is a *separate* track — cockpit/sentry tooling. Not part of
  this deliverable; ignore unless asked.)

**Read first, every session:** `portfolio/docs/cellular-gaits/SYNC.md` (live state board — read first,
update last, commit with your work), then `cellular-gaits/AGENT_SAFETY.md` (the 7 safety rules:
never delete/modify files you didn't create; scratch in one dir you make; commit your work on your
branch before finishing; don't merge to main unless told).

## Working model (important — don't over-engineer the infrastructure)
- **This phase is all Mac-local**: Python (Brian2 brain runs on a laptop, ~15s per 1s of sim; MuJoCo
  body) + agent coding. Just work in the repos directly.
- **Sentry** (the Windows 5900X/3080Ti box, reached via the `cg`/cockpit dispatch tooling) is **only**
  for heavy compute — full evolutions, RL. **Do NOT reach for `cg run`/`cg runi` for this work**; none
  of it needs sentry.
- For an actual long compute run, a plain `uv run python ...` in a terminal (streamed live) beats a
  headless agent session (which can orphan background jobs). Use `uv` for everything (`uv sync`, `uv run`).
- Pull at session start, commit + push at session stop. One branch advanced from one machine at a time.

## What's BUILT and validated (Phases 0–1, all on `feat/n-rl-navigation`)
- **Brain** — `cellular-gaits/src/cellular_gaits/brain/`: `BrainModel` API (load/activate/silence/
  run/step, build-once then `step()`, runtime-settable Poisson input) over the vendored Shiu et al.
  2024 LIF model + FlyWire v783 connectome (~138k neurons, ~15M synapses; `Connectivity_783.parquet`
  ~97MB is gitignored, fetched via `fetch_data.sh`). **Validated:** activating sugar taste neurons
  drives feeding motor neuron MN9 0 → ~80 Hz (a textbook pathway, proves the wiring is right).
- **Escape circuit** — `brain/neurons.py`: LC4/LPLC2/DNp01 (Giant Fiber) IDs by hemisphere +
  `looming_to_giant_fiber(brain, lc4_hz, lplc2_hz) -> dnp01_rate`. **EB-0B finding:** looming drive →
  GF up to ~190 Hz, sub-additive size+velocity summation (matches von Reyn/Ache), silencing zeroes it.
  **Honest caveat: the isolated GF saturates** — real selectivity lives in whole-brain inhibition this
  stack doesn't capture. So the claim is "the real connectome routes looming → embodied escape," NOT a
  calibrated escape threshold.
- **Body** — `src/cellular_gaits/embodied/body.py`: `apply_escape(env, drive, direction)` over
  NeuroMechFly (87 joints, MuJoCo), reusing a trained escape controller (`escape_controller.json`).
- **Closed loop** — `src/cellular_gaits/embodied/escape_loop.py` (**EB-1, WORKS**): looming → real
  brain → GF rate → escape drive+direction → body bolt → feedback. Results: **left threat → GF 133 Hz
  → bolts right (−28°); right threat → GF 100 Hz → turns left (+3°, weaker); baseline (no threat) →
  GF 0 Hz, just walks.** Three hand-tuned interface mappings (the design-decision core):
  1. sensory map: looming magnitude → neuron Hz (`Hz = 150·loom`, cap 200);
  2. motor map: GF rate → drive (capped at a *moderate* ~0.2, not linear-to-1 — saturated drive
     tumbles the body), **direction from the looming L/R bias** (not from GF L/R, which is wiring-
     asymmetry-dominated);
  3. sync: brain↔body step in lockstep every 15 ms (Eon parity), build-once-then-step.
- **Docs** — `cellular-gaits/docs/embodied/`: `REPORT.md` (the master pedagogical report — the
  deliverable's spine) + four deep-dive explainers (`brain_explainer.md`, `neurons_report.md`,
  `body_explainer.md`, `escape_loop_report.md`). Plan: `portfolio/docs/cellular-gaits/EMBODIED_BRAIN_PLAN.md`.

## The deliverable we're building now
**A portfolio section presenting the report AND an interactive simulation.** Constraint: the 138k-neuron
brain **can't run in-browser**, so we *precompute* the escape-loop runs in Python and the web page
**replays + visualizes** them (same pattern as the existing behavior pages that consume
`portfolio/public/cellular-gaits/data-*` bundles). Three chunks:

1. **Report backbone — DONE.** `cellular-gaits/docs/embodied/REPORT.md`. (Review/refine for honesty
   and intuitiveness; it's the spine the page renders.)
2. **Data export — prompt ready, NOT yet run.** `cellular-gaits/ops/prompts/PROMPT_eb_2a_simdata.md`.
   A new `scripts/export_embodied.py` runs the loop for left/right/baseline, renders mp4 clips,
   exports trace + circuit JSON to `portfolio/public/cellular-gaits/data-eb/`, and reports the exact
   JSON schemas. **Mac-local.**
3. **Interactive web page — NOT yet written.** Write its prompt *after* chunk 2 reports the artifact
   shapes (so it references exact paths). Portfolio house style, anatomy-anchored, MuJoCo-WASM body +
   the precomputed brain/GF/looming traces. Renders the report + the replayable simulation.

## Honest limitations — carry these into everything (this is the brand)
Not a calibrated threshold or in-vivo selectivity; a cartoon LIF neuron (no dendrites/plasticity/
neuromodulation, wiring frozen); one predicted snapshot connectome (NT signs predicted, not measured);
hand-tuned sparse coupling (3 mappings, one descending neuron, hand-built looming front-end as the
visual-pathway stand-in); one behavior; inherited left/right body asymmetry; ground-only escape.
"Structure → behavior" is a direction we explore, not a proven sufficiency claim.

## Immediate next action
1. Read `REPORT.md`, `EMBODIED_BRAIN_PLAN.md`, and `SYNC.md` to load full context.
2. Run chunk 2 locally: execute `cellular-gaits/ops/prompts/PROMPT_eb_2a_simdata.md` (the data export).
3. When it reports the artifact shapes, write + execute the chunk-3 web-build prompt.
Commit on `feat/n-rl-navigation`; update SYNC.md last.
