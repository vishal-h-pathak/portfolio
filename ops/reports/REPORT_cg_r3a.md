# R3 · WP3a — The connectome climax (Embodied + Escape)

Branch: `feat/cg-r3a` (isolated worktree). Portfolio content/explanation/diagram work only —
no new compute, existing precomputed data reused. `npx tsc --noEmit` clean. Human validates on
`localhost:3000` and pushes; the four R3 branches are merged into `feat/cg-redesign` together.

## What changed

### Data (task 7 prerequisite)
Copied the WP2 schema-v2 bundle from `~/dev/jarvis/cellular-gaits/outputs/r2_clips/` into
`public/cellular-gaits/data-eb/`:
- `trace_left.json`, `trace_right.json`, `trace_baseline.json` (v1 → v2)
- `manifest.json` (`schema_version` 1 → 2)
- new: `flee_left_topdown.mp4`, `flee_right_topdown.mp4`, `walk_baseline_topdown.mp4`

**Additive, confirmed by diff:** the v2 traces add only `summary.pivot_step` / `pivot_t_s` /
`pivot_threshold_deg` and the `threat_track{}` block. **Zero keys removed, zero type changes** on
the fields the existing `EmbodiedConditions` parser reads (`condition`, `threat_onset_step`,
`control_dt_s`, `summary.{gf_peak_hz,drive_peak,displacement,heading_change_deg,turn_vs_baseline_deg,
threat_min_dist,threat_hit}`, `brain`, `body`). `circuit.json` / `gf_response.json` / the primary
birdseye clips were byte-identical and left untouched. `EmbodiedConditions` (not in this WP's owned
set) was **not edited** — it ignores the new fields. The manifest `config`/`conditions` shapes the
embodied page parses are unchanged in v2. *(Human verifies the condition panels still render
post-merge, per instruction.)*

### Embodied page (`app/projects/cellular-gaits/embodied/page.tsx`)
- **§2 LC4/LPLC2/DNp01 explainer (task 1).** Rebuilt as a real "what / where / why," anchored on
  `BrainCircuitMap`. New three-cell breakdown (what each encodes), a "where they come from" para
  (FlyWire v783, lobula complex → descending; 316 cells all resolve in the run brain), and a "why
  these three" para (cleanest mapped looming→escape pathway; von Reyn 2017 + Ache 2019; the
  right-heavy synapse asymmetry, real counts). Exact copy quoted below.
- **§5 "built once, then stepped" drawbacks (task 4).** Added an explicit drawbacks list: the 15 ms
  sync may be too coarse for fast behaviors; the single-DN readout is quantized (~33 Hz steps) and
  flickers; no sub-window dynamics.
- **§7 "rung 01" clarified (task 5).** Lead now defines rung 01 (NCA null model, the starting
  placeholder) → rung 02 (closed loop) → rung 03 (this page, the climax). The ladder anchor tag
  changed from the confusing `RUNG 01 · LIVE TODAY` to `RUNG 01 · THE STARTING PLACEHOLDER`, and the
  figcaption now says rung 01 is where the line *starts*, not the destination.

### Components
- **`EmbodiedLoop.tsx` (task 3).** Sense / Descend / Body cards now carry a second mechanism line
  (what's computed), and the Descend/Body popouts gained "what's actually computed" detail (drive is
  capped at a moderate level; the body move is a lateralized gait perturbation that yaws away). The
  "hover · tap · focus" affordance was replaced with a single subtle `ⓘ` glyph per card (the wordy
  line read as clutter), with the instruction stated once in the caption. Tap already reveals + pins
  on touch via the existing `toggle()`; the glyph now signals it.
- **`ControllerLadder.tsx` (tasks 3, 5).** Rung stages relabeled `RUNG 01/02/03` (was `01/02/03`),
  rung 03 marked `· THE CLIMAX`. The per-box `ⓘ hover · tap · focus` clutter replaced with one
  corner `ⓘ` glyph + a single header instruction.
- **`GfResponse.tsx` (task 2).** Added a body-consequence callout that mirrors the silence toggle:
  silenced → GF quiet → the fly just walks = **exactly the no-threat baseline run**; live → GF fires
  → the body bolts. Ties the toggle to the *body*, not only the curve.
- **`EscapeCircuit.tsx` + escape page connectome explainer (task 8).** Fixed a factual error: the
  copy said "~55 LC4 + ~108 LPLC2 **synapses** onto its lateral dendrite" — those are per-hemisphere
  *neuron* counts. Now: "~55 LC4 + ~108 LPLC2 **neurons** per hemisphere, through hundreds of
  synapses (LC4 ~374–431, LPLC2 ~458–622 per side in FlyWire v783)."

### Escape page (`app/.../behaviors/escape/page.tsx`, tasks 7, 8)
- New server-rendered section **"Where the threat came from, when the fly pivoted"** reading the
  data-eb v2 traces and rendering three world-fixed top-down panels (`EmbodiedLoopMap` / `EbPanel`,
  local server components). Each panel marks, straight from the trace: where the threat **entered**
  (`threat_track.entry_xy` + its incoming `path_xy` to the `aim_xy` ✕), and the **pivot** instant
  (green ring at `summary.pivot_step`, labelled `+N ms after onset`). Left pivots +92 ms, right
  +80 ms; baseline has no threat and never pivots (just walks). Pre-onset walk is dim, the bolt is
  bright.
- **Offers the top-down camera angle:** the three `*_topdown.mp4` world-fixed clips below the map.
- Labelled clearly as the connectome embodied-loop runs (linked to the Embodied tab), distinct from
  the hand-built escape controller above. Removed an internal-codename leak ("X-A controller" →
  "escape controller").
- (task 6) The configurable option exposed within existing precompute is the **top-down camera
  angle** (per the prompt's cross-ref to #7). Deeper interactivity is flagged below.

### CSS (`app/globals.css`)
Appended styles for `cg-eb-celltypes/celltype*`, `cg-eb-drawbacks`, `cg-eb-affordance`,
`cg-gf-body*`, `cg-eb-map/-grid/-svg`, `cg-eb-topdown-clips`. No existing rules changed.

## Exact new copy — the LC4 / LPLC2 / DNp01 explainer (embodied §2)

**Lead:**
> The circuit Vishal kept coming back to. Inside that brain is the real escape sub-circuit — three
> identified cell types, the cleanest known looming-detector → escape pathway biology hands us. The
> looming detectors **LC4** (≈ angular velocity) and **LPLC2** (≈ angular size) sit laterally in the
> lobula complex, behind each eye, and converge ipsilaterally onto **DNp01, the Giant Fiber**, which
> descends toward the body. The wiring is asymmetric, and it is drawn so you can see it: each edge's
> thickness *is* its synapse count.

**The three cell types (cards, counts from `circuit.json`):**
- **LC4** · 104 neurons · cholinergic — A **lobula columnar** visual projection neuron tuned to a
  looming object's **angular velocity** — how fast its image is expanding. The "it's coming *fast*"
  channel. Sits laterally in the lobula complex, right behind the eye.
- **LPLC2** · 210 neurons · cholinergic — A **lobula-plate/lobula columnar** projection neuron tuned
  to **angular size** — loom geometry, the object filling the eye near collision. The "it's getting
  *big*" channel. Also lateral, in the lobula complex.
- **DNp01** · the Giant Fiber · 2 (1/side) — The **descending command neuron** for fast escape — one
  per hemisphere, the largest axon in the fly. LC4 and LPLC2 converge on its lateral dendrite; it
  **sums size + velocity** and carries the "escape now" command down toward the ventral nerve cord.

**Where they come from:**
> Every cell here is a real, addressed neuron in the **FlyWire v783** connectome — the
> electron-microscope wiring diagram of a whole adult *Drosophila* brain. CX-1's curation pulls
> **104 LC4** + **210 LPLC2** → **2 DNp01** (316 cells total), and all 316 resolve in the brain we
> run — no version drift, because both are keyed to v783. The convergence is **ipsilateral**: each
> eye's detectors drive that side's Giant Fiber.

**Why these three:**
> This is textbook escape wiring, and the most tractable place a connectome can drive a body: a
> small, self-contained sub-circuit (316 cells, not 138,639) with a known function. von Reyn et al.
> 2017 showed the Giant Fiber sums angular size and velocity to time a takeoff; Ache et al. 2019
> dissected the LC4 (velocity) vs LPLC2 (size) division of labor converging on it. Driving LC4 +
> LPLC2 in the live connectome makes DNp01 fire, and the asymmetry is real: the right Giant Fiber
> carries more converging synapses than the left — 431/374 for LC4, 622/458 for LPLC2 — which is
> exactly why the right Giant Fiber out-fires the left in the live run. The brain outline is a
> hand-drawn schematic for placement, not a literal neuropil render; the counts and synapses are
> real.

*(Counts/synapses rendered live from `circuit.json`, not hardcoded.)*

## Compute follow-ups flagged (not done here — they need new precompute / a live brain step)
- **Deeper EmbodiedLoop interactivity.** Arbitrary threat azimuths, splitting the channels
  (LPLC2 ← size, LC4 ← velocity), a graded rather than all-or-nothing response, or re-stepping the
  brain live in-browser all need new precompute or a running connectome — out of scope for a
  content pass. The exposed config stays the 3 precomputed conditions + 2 camera angles.
- **Scrubbable / play-head pivot replay.** The threat-entry + pivot view is rendered as static
  world-fixed SVG markers from the trace. A frame-by-frame scrub with a moving play head is
  *portfolio-only* (no compute — the per-step `body`/`threat_track.path_xy` arrays are already in the
  bundle); deferred to keep this pass low-risk, not blocked on compute.
- **New camera angles / new conditions / a non-saturated threshold curve / takeoff** — all
  cellular-gaits compute, per `REVISION_PLAN_R2.md` §3.
- **Real-*Drosophila* looming-takeoff reference clip** — still a deliberate gap (licensed asset,
  not scraped); the placeholder in the escape page is unchanged.

## Verification
- `npx tsc --noEmit` → exit 0.
- Did NOT run `npm run dev` / `next build` (symlinked `node_modules` breaks Turbopack, per launcher
  override). Human does the visual `localhost:3000` validation after merge.
- Data additive-ness confirmed by structural diff (no removed keys / type changes).
- Did NOT touch `EmbodiedConditions.tsx`, `lib/mujoco-fly.ts`, `FlyStage`, or the shared
  `cg-redesign` worktree. No merge, no push.
