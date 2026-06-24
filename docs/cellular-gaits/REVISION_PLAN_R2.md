# Cellular Gaits — Round-2 revision plan (post-redesign, from live walkthrough)

> Round 1 (`REDESIGN_REVIEW.md`, WP-A–E) restructured the narrative and put the embodied climax on
> the site. Round 2 is Vishal's page-by-page feedback after using the rendered site. The throughline:
> **the fly's behavior is hard to read, and visuals must build intuition — every visual should tie a
> design decision to a visually identifiable behavior in the fly, and show how the fly is doing
> against its goal.** Built on `feat/cg-redesign`. This plan folds in the QA punch list too.
>
> **The goal:** a polished showcase to open a conversation with someone at eon.systems — taken as far
> as it stays interesting. Not a production system, and explicitly **not** a Loihi/neuromorphic
> deployment. The full optic-lobe/vision pathway and the neuromorphic horizon live in the §3 follow-up
> roadmap (ongoing improvement), **not** the active work.

## 0. The single biggest lever (root cause found)

Every clip and on-page replay renders through one **tracking camera** (`<fly>/trackingcam`) that
keeps the fly centered. That is *why* movement looks erratic and success looks like failure — there's
no world reference, so displacement and turning read as jitter. This is mechanical, not inherent.

**The fix (cross-cutting):** render/show behavior from legible perspectives —
- a **bird's-eye / world-fixed camera** (the fly moving across a static arena), and/or a **2D
  top-down plane** with the environmental factors drawn in (threat object + its entry vector; odor
  source + gradient; obstacles; the goal/heading);
- **annotate the moments that matter** — threat entry point, the pivot instant, contact, fall — as
  live/scrubbable markers, not a blur;
- **surface the objective** — show how the fly is performing against its actual reward (forward
  distance; heading retention; threat cleared / min-distance) so "success vs failure" is explicit.

The top-down trajectory replays already on the Embodied page (which Vishal likes) are the seed of
this — they need the environment, the event markers, and a clearer body glyph. This theme touches
escape, perturbation, chemotaxis, navigation, and the embodied condition panels.

## 1. Cross-cutting themes (the big levers)

**A. Behavior legibility (the #1 frustration).** Re-render clips with a bird's-eye/world-fixed camera
+ visible environment + event annotations + a reward/progress readout. Add a 2D top-down "what
actually happened" view alongside the 3D clip for every behavior. *Root cause: single tracking cam
(§0).* — render-pipeline work in `cellular-gaits` (the `render_*`/`export_*` paths, which already
take a `renderer_camera`) + web viz.

**B. The connectome lighting up — bounded to what we already compute (the one place the Eon look
earns its place now).** Upgrade the Embodied page's brain-region map from a *schematic* 2D SVG
(`BrainCircuitMap`) into a real **3D point cloud at FlyWire anatomical positions**: render LC4 / LPLC2
/ DNp01 as points where they actually sit, **lighting up over the escape, driven by the per-window
firing rates we already export** (`data-eb` traces), scrubbable with the condition + GF trace.
Optionally a dim **full-brain point-cloud silhouette** behind it (the ~138k resting positions are a
cheap static WebGL asset) so the circuit flares against the whole connectome — Eon's exact look.
- **Why it's not over-engineered:** ~316 active neurons (104 LC4 + 210 LPLC2 + 2 DNp01) + an optional
  static backdrop + firing data we already have. Trivial Three.js point cloud.
- **Why it's useful:** it answers the page's own open question (what are LC4/LPLC2/DNp01, where do they
  come from, why these groups) by *showing* it in real anatomy, and it replaces a schematic with truth.
- **Honest edge over the reference:** Eon's glowing brain is *predicted vision* activity they call
  "decorative"; ours is driven by the **actual LIF activity we computed** — a stronger, more honest claim.
- **The one gating unknown → a ~30-min spike:** can we fetch **neuron XYZ coordinates** for our IDs
  (FlyWire publishes soma/synapse positions)? If yes, it's a small add to `export_embodied.py`
  (positions + optionally per-neuron rates) + one Three.js component. Confirm before committing.
- **Deferred (NOT this):** the full optic-lobe/vision pathway (Lappalainen model, vision
  non-decorative) — that's the ambitious version and lives in the §3 follow-up roadmap.

*Reference decoded (Eon's `blogpost-fly-video.mp4`, analyzed frame-by-frame; gitignored locally) — the
aesthetic to borrow for the bounded viz above, and the blueprint for the deferred full version (§3):*
- **Structure = a staged reveal:** environment alone (~0–11s, fades up from black, no brain) → the
  split-screen with the brain "switching on" + the caption *"simultaneous brain emulation"* (~12s) →
  a black "eon" end card (~37s). Copy this beat structure (env first → "and here's the brain" → logo).
- **Brain panel = point cloud on pure black**, frontal "butterfly" silhouette from real neuron XYZ:
  two lateral **optic lobes** + central brain + a small ventral midline cluster. **Resting palette
  two-tone** (teal/cyan lobes, magenta/purple center, one blue landmark). **Activation = warm
  gold/white additive bloom** (cyan→gold as a region fires) + **discrete hot-pink point-bursts** in
  the center for specific events. **Brain camera stays static** so the *activity* is the only motion.
  The optic lobes flare gold when the fly is moving/seeing; the glow pulses with activity.
- **Left panel = cinematic multi-shot edit** (see theme A) of the fly foraging → grooming → eating in
  a soft low-poly pastel arena; food made legible by a colored scent stain + a clear food object.
- **Feasibility / our honest edge:** Eon's own post says their vision is still "decorative" (predicted
  activity, shown but not driving behavior). **We already compute real per-neuron LIF firing rates**
  in the escape runs, so our point-cloud glow can be driven by *actual* activity, not predicted —
  a stronger, more honest claim. The one asset to confirm first: **neuron XYZ coordinates** (FlyWire
  provides soma/synapse positions; verify they're in or fetchable into our brain stack). Then it's a
  precompute (firing rates → per-neuron color/intensity per frame) replayed on the web (Three.js
  point cloud), same pattern as the other `data-*` bundles. Start with the escape circuit (we have its
  activity) before the full vision pathway; label honestly what's measured vs predicted.

**C. Global navigation affordance.** Don't make visitors rely on browser-back. Every page (especially
the behavior sub-pages) needs an explicit, consistent **back / up-to-parent** control (back to the
behaviors hub / to the project). The layout already has a top "← BACK" to home + the tab nav; add a
clear sub-page back so no page is a dead end. Quick global fix in `layout.tsx` / `CgTabNav`.

**D. Interaction/reset bugs (reported live).** Resets are broken on multiple live demos and need a
sweep: **Sensing** (reset reruns numbers but the visual goes blank), **Perturbation** (reset doesn't
work), **Chemotaxis** (reset doesn't work), **Escape** (threat visual breaks and can't reset). Plus
the QA-found **Embodied condition clips never load** (the mp4 `<video>` has no working src — §QA).
Audit every live demo's reset/replay state machine.

**E. Text/graph/diagram cleanup (pervasive).** Lines run through labels and text overlaps figures in
many places: the GF response graph, the brain-region map synapse labels, the "line this completes"
diagram, Search & Objective's graph, the escape circuit diagram, the vertical-text loop diagram. A
dedicated legibility pass on every SVG/recharts label (no overlaps, no lines through text, no vertical
text).

**F. The "explain it / connect it to the fly" standard.** Every interactive control gets a one-line
"what this does"; every number gets "what it is and why it's here"; every visual states the
behavior-in-the-fly it maps to. If a control does nothing, wire it or remove it. This is the bar for
every page below.

## 2. Page-by-page (Vishal's items + proposed approach)

### Controller
- **Buttons appear to do nothing / unexplained** — audit `CriticalityPlayground` controls; wire or
  remove, and label exactly what each does.
- **The 4×4 channel grid isn't intuitive** — state what it represents; different configs "all look the
  same" in the flashing grid → make the regime difference *visible* (e.g., order vs chaos signature),
  not just a number.
- **Lyapunov & state-change numbers** — explain what they are and why they're prominent; right now
  they float without meaning. Tie λ-crossing-zero to the gait cliff explicitly.
- **Sensitivity visual + log(d/ε) graph** — mostly a flat line; explain what divergence-of-trajectories
  is showing, or replace with something that builds the edge-of-chaos intuition.
- **Bar:** the page must make "edge of chaos → good gait" visible on the *fly*, not just in abstract
  dynamical-systems plots. Consider showing two fly gaits (ordered/critical/chaotic) side by side.

### Sensing
- First visual (proprioception on the live fly) is **great**; **fix the reset** (reruns numbers but
  the visual blanks).
- **Open-loop vs closed-loop**: the two near-identical diagrams (one extra line) are redundant and
  weak. Consolidate into one richer visual that shows the original (open-loop) and everything built on
  top since — i.e., use the *current* project state, not a toy before/after.

### Mapping
- Loved visuals, but **explain the slider** (it appears to move motor joints) — add a visual *under*
  the slider showing the actual joints being affected.
- **Define "override"** (what pinning/overriding a cell does).
- **Expand the grid + rescale equations** — what they are, what they do to the fly.
- **The Alternatives section is the most interesting** — those proposals (real descending-neuron
  readout, etc.) would make great visualizations; promote them.
- Bar: make clear what this page teaches (grid cell → joint target is a convenience, not biology — and
  the real version is the descending interface on the Embodied page).

### Search & Objective ("worst page so far")
- Reframe to answer plainly: **what did we try to do, and how did it go?** (CMA-ES tuned the 660-param
  NCA from a stagger to a ~29 mm/s gait — a success; distinguish it from the navigation RL that did
  *not* generalize, so it's clear which was which.)
- **Needs a visual with an actual fly** — show generations of the fly's gait improving (snippets of
  early/mid/late generations), not just an abstract 2D toy.
- **The gain graph is unreadable** — clarify every variable and its implication; clean overlapping
  text.
- **The CMA-ES toy** — explain what the clustering/covariance ellipse means and why we cluster there;
  the "watch the green covariance ellipse rotate" blurb is opaque. Tie it to *searching for a better
  fly*, or reconsider the abstract toy.

### Embodied
- **Words clip out of boxes** (Sense/Descend/Body) — fix; and add **more content** in those boxes +
  **more configurable options** for the toy simulator and the fly's behavior.
- **Update to match the project's current state**; clarify "**rung 01**" (the ladder area can likely be
  modernized or retired now that this *is* the climax).
- **"hover · tap · focus" affordance looks bad** on every box; on **mobile, tap should reveal** the
  box info.
- **Escape-circuit visualization (obsessed)** — build deeper understanding of **what LC4 / LPLC2 /
  DNp01 are, where they come from, and why they're the right groups** for this project.
- **Giant Fiber viz** — good, but **show the implication of *not* using it** in the fly's behavior; and
  **clean the graph text** (line goes through text).
- **Left/right/baseline panels (a throughline favorite)** — keep them, but the fly's movement is hard
  to read → **alternate camera angle** (see §1A).
- **"The line this completes" diagram** — text overlaps figures, lines aren't connected; clean up.
- **Honest limits** — make this the *last* section and turn it into a remediation plan (see §3); use
  the available hardware.
- **"Built once, then stepped"** — explain it and its explicit drawbacks.

### Behaviors (hub)
- **Stop repeating the (poor) open/closed-loop diagram** across Behaviors + Sensing; the **vertical
  text is hard to read**.
- Replace with **small block diagrams** that break down and connect the implemented behaviors
  (how they relate / build on each other).

### Perturbation
- **Shoving the fly is exactly the right kind of intuitive interaction** — keep it; **fix the reset.**
- **Open vs closed-loop difference is too subtle** — make it richer / clearer how much "better" the
  closed loop does (ties to §1A: show the objective).
- Clarify **what the fly is walking toward** and what "**on course**" means (it's heading retention).
- Clean the **proprioception visual text**; explain where `actuator_length` and foot-contact values
  come from.

### Chemotaxis
- The "live" version (antennae lighting up while approaching the source) is the **better visual** —
  lead with it; **keep the movable source**; **fix the reset.**

### Escape
- **Clean diagram text.**
- **Threat visual breaks and can't reset** — fix.
- Like the six visuals; **clean their text.**
- Hard to read **where the threat entered and when the fly pivoted** → make these **live/real-time**,
  showing the **moment of pivot** (ties to §1A: event annotation + camera angle).

### Navigation
- **Implement the live animation/visual** (currently a stub) and add substantial explanatory content —
  or, given it's the least connectome-aligned behavior, decide whether it stays a first-class page.

### QA punch list (from the rendered-site pass — fold in here)
- **Blocking:** Embodied condition-panel clips never load (`EmbodiedConditions.tsx` `<video>` has no
  working src; wire to `/cellular-gaits/data-eb/<clip>.mp4`, `autoPlay muted loop playsInline`, mirror
  `EscapeDemo`).
- Top nav truncates "APPENDIX" → "APPE" (the longer WP-B labels overflow — wrap/shrink/scroll/shorten).
- Brain-region map: synapse-count labels collide with node text.
- Four-part loop: DNp01 node overlaps the converging arrowhead.
- Copy: missing space "Giant Fiber**escape**…"; "**D's** real MuJoCo sweep" leaks internal vocabulary.

## 3. Addressing the "honest limits" — a remediation roadmap (the last section of the report)

For each documented limit: what it would take to move on it, given the hardware (a local **5900X +
RTX 3080Ti** box, reachable via the existing cockpit/sentry tooling, and **openness to cloud** for
anything that needs more than 12 GB VRAM or long runs). Honesty stays the brand — these are *directions
with cost*, not promises.

- **Vision is hand-built / decorative — and the full Eon-style optic-lobe visualization (headline
  follow-up).** Wire the Lappalainen connectome-vision model (NeuroMechFly `advanced_vision`) so real
  looming drives LC4/LPLC2 instead of the hand-built front-end, and render the full visual pathway
  lighting up in response to the environment (the Eon-video look — blueprint in §1B). This is the most
  ambitious item and the natural "how far can I take it" direction; deliberately *not* active work.
  Compute: GPU-friendly; the 3080Ti handles inference; precompute → replay. (The bounded escape-circuit
  point cloud in §1B is the *active* slice of this idea; this is the someday-full version.)
- **Not a calibrated threshold / isolated GF saturates.** Needs whole-brain inhibition/normalization
  in the loop (run more of the connectome's context, not just the addressed VPNs). Compute-heavier
  brain runs → the box, or cloud for batch sweeps. Deliverable: a threshold/selectivity curve that
  *isn't* saturated.
- **Coarse, flickering single-DN readout.** Average over more GF-pathway neurons / longer windows, or
  population read-out (multiple DNs) — cheap compute, mostly modeling. Removes the 133-vs-100 flicker.
- **Hand-tuned sparse coupling (3 knobs, one DN).** Replace hand-tuning with a small RL/optimization
  over the interface mappings (the nav RL harness already exists) — box/cloud GPU. Or add more DNs
  (DNa01/02 steering, oDN1 forward) per Eon's set.
- **Size/velocity driven identically.** Split: LPLC2 ← angular size, LC4 ← expansion rate (the reason
  the fly has both) — modeling change, cheap; pairs with the vision model.
- **One behavior, ground-only, no takeoff; inherited body asymmetry.** Add behaviors via the same brain
  (feeding: sugar GRN→MN9; grooming: antennal→aDN — both already work unembodied) and/or a takeoff
  body primitive; retrain/symmetrize the escape controller. Box for controller training.
- **Predicted NT signs / cartoon LIF / frozen wiring.** Inherent to the substrate; the honest move is
  to *state* it and, optionally, show sensitivity to NT-sign predictions. (Neuromorphic / Loihi
  deployment is **not a goal** of this project — noted only as the field's long-range horizon.)
- **What needs cloud vs the box:** box (12 GB) handles vision inference, controller RL, most brain
  runs; cloud for large batch sweeps (threshold calibration across many stimuli) or if a full-brain
  context run exceeds VRAM. Worth a small spike to measure the full-brain memory footprint first.

## 4. Work-package sequencing (proposed)

- **R2-WP1 — Quick wins & bug sweep** (portfolio, no compute): global back-nav (theme C), the clip
  loading fix + all broken resets (theme D), the text/label overlap cleanup (theme E), the QA copy
  nits, nav overflow. High impact, low risk, ships fast.
- **R2-WP2 — Behavior legibility re-render** (cellular-gaits compute + portfolio viz): bird's-eye /
  world-fixed + 2D top-down with environment + event annotations + reward readout, re-exported for
  escape/perturbation/chemotaxis/embodied (theme A). The biggest intuition win.
- **R2-WP3 — Per-page intuition passes** (portfolio, mostly copy + small viz): Controller, Mapping,
  Sensing, Search & Objective, Behaviors block-diagram, Embodied box content + LC4/LPLC2/DNp01
  explainer + "implication of no Giant Fiber." Depends on R2-WP2 for the behavior visuals.
- **R2-WP4 — The bounded brain point-cloud viz** (small `export_embodied.py` add + one Three.js
  component): the escape circuit at real FlyWire positions, lit by the firing rates we already compute
  (theme B). Gated on the XYZ spike. The one "Eon look" piece that's in scope — high wow, bounded.
- **R2-WP5 — Honest follow-up roadmap (§3), ongoing, not active.** The full optic-lobe/vision pathway
  and the other honest-limit directions live here as the "how far can I take it" backlog — pursued out
  of interest, not required for the showcase.

Each WP gets its own self-contained `PROMPT_*.md` and runs against `feat/cg-redesign` (or a child
branch) in its own worktree, per the Round-1 pattern. Confirm priorities before drafting WP prompts.
