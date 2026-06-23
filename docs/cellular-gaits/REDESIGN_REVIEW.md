# Cellular Gaits — site redesign review & integration plan

> Adversarial review of the existing `/projects/cellular-gaits/*` site, written to drive a
> redesign **before** connecting the final piece (the embodied connectome escape loop). Produced
> from a deep code/content audit (all 10 routes + 34 components) cross-checked against the live
> site (vishal.pa.thak.io). This is a planning artifact: §6 breaks the work into delegate-ready
> Claude Code packages. Reviewed by: Cowork mission-control session, 2026-06-23.

## 0. The one finding above all others

The project's **true climax is not on the site.** The built, validated result — a real FlyWire
connectome run as a 138,639-neuron spiking LIF brain, where a looming threat routes through real
wiring to the Giant Fiber (DNp01) and bolts the body (GF 0→133 Hz; left threat → −28° away, right
→ +3°; sub-additive LC4/LPLC2 convergence) — is documented only in
`cellular-gaits/docs/embodied/` and appears **nowhere** in the live UI.

Worse, the site actively tells a *staler, smaller* story than the project achieved:

- The **Embodied** tab is a reading list + a "Controller Ladder" that marks the NCA null-model as
  "01 · TODAY (live)" and the connectome as "04 · FRONTIER · FlyWire **VNC** connectome" — i.e.
  unreached, far-future, and the *wrong subsystem* (it points at a VNC leg-walker that was never
  built, not the brain escape circuit that was).
- The **Frame** lede sells the NCA toy: *"A decentralized controller drives a simulated
  Drosophila…"* A first-time reader leaves thinking this is a cellular-automaton locomotion demo.
- The **homepage card** (`content/projects.ts`) headlines "evolved cellular automaton walks a
  simulated fly," RESULT "~29 mm/s gait" — the most stale public-facing claim of all.

Everything below is, in effect, cleanup around one structural correction: **give the realized
connectome-escape loop a real, anatomy-grounded home as the site's climax, and re-point the whole
narrative at it.**

## 1. Live-site UX observations (rendered, not just code)

- **Frame hero renders blank.** The top video panel on `/cellular-gaits` (the `best.mp4` hero) shows
  as an empty black box on the live site — either a load failure or an autoplay/poster issue. Fix or
  replace; right now the landing page leads with a void. (It's also redundant with the `CAPlayer`
  below it, which keys off the same `best.mp4`.)
- **Layout uses a narrow left prose column** (~620px) with a large empty right gutter on desktop,
  while diagrams (EscapeCircuit, the ladder) span the full ~920px width. The asymmetry is part of
  the "bench notebook" aesthetic, but the empty right column is dead space that a margin figure,
  pull-quote, or anatomy thumbnail could earn.
- The dark bench aesthetic, monospace section tags (`§ THE FRAME`), and serif hero are consistent
  and strong across pages — the *visual system* is good; the *story* is what's stale.

## 2. Cross-page structure — the spine is now wrong

Current reading order (`components/cellular-gaits/tabs.ts`):

> Frame → Body → Controller → Sensing → Mapping → Objective → Optimizer → Embodied → Behaviors → Appendix

This spine was designed for a project whose deliverable was "an evolved NCA walks a fly, one
modeling-choice per tab." That project shipped. Three structural failures now:

1. **The climax is mis-slotted and under-built.** "Embodied" sits at position 8 as an abstract
   ladder, *before* Behaviors, and frames the connectome as unreached. The actual connectome result
   lives (conceptually) two clicks deep under Behaviors → escape. The lede is buried below where it
   belongs.
2. **Five concept tabs (Controller, Sensing, Mapping, Objective, Optimizer) carry "frontier" slots
   that promise a connectome that has now arrived — but point at the wrong one** (VNC leg-walker)
   and at a tab (Embodied) that doesn't pay it off. Five promises, broken destination.
3. **Redundancy clusters:** Controller & Objective both render the single-peaked gain→distance
   curve; Objective & Optimizer share an identical MAP-Elites "Stage 3" frontier; Sensing &
   Perturbation both explain open-vs-closed (Sensing as "can't run yet," Perturbation as "here it
   is").

### Proposed information architecture

> Frame → Body → Controller → Sensing & Loop → Mapping → Search & Objective → Behaviors →
> **The Embodied Fly** → Appendix

- **Rewrite the Frame lede** to state the achieved endgame first ("A real fly connectome, run as a
  spiking brain, drives a real fly body: a looming threat becomes a Giant-Fiber spike becomes an
  escape"), then frame each tab as a layer of *that* loop. Add the missing Behaviors + Appendix
  entries to the on-page tab index (currently only 7 of 10 are listed).
- **Rename "Embodied" → "The Embodied Fly"** (or "Connectome → Body"), **move it to penultimate
  (after Behaviors, before Appendix)**, and rebuild it from reading-list → the climax page (§3, §4).
- **Merge Objective into Optimizer** as "Search & Objective" — they share the curve and the frontier.
- **Fold Sensing's "test we can't run yet" into a direct open-vs-closed result** (the closed loop now
  ships); retitle "Sensing & Loop."
- **Reorder the Behaviors hub to lead with escape**, flagged "the connectome bridge → The Embodied
  Fly"; demote the `navigation` stub (a `// TODO`, and the site itself calls it the least
  connectome-aligned behavior) out of the front rank.
- **Retarget the `ControllerLadder`**: the connectome rung becomes "DONE / LIVE — brain escape loop,"
  green, not a dashed VNC frontier; drop the never-built CPG rung.
- **Cut or replace `BuildPlanDAG`** in the Appendix — it's a stale internal build plan (leaks the
  wave/prompt process, predates every behavior and the refocus).

## 3. The fly-connection gap (highest-priority new work)

The `PARTNER_BRIEF.md` rule: every visualization anchors to the fly's actual anatomy — body, the
specific sensors, the motor plant, and increasingly the brain regions; "map signals onto where they
physically live on the animal." The site honors this in places (`SensorOverlay` draws proprioception
on the body; `EscapeCircuit` names LC4/LPLC2/DNp01). **But the brain is invisible** — no picture of
where LC4, LPLC2, or the Giant Fiber physically sit, no FlyWire layout, no head/eye anchoring of the
looming input, no brain→VNC descending pathway. The connectome, the whole point, is drawn only as
abstract boxes.

Cheap to fix: `public/cellular-gaits/model/` already ships the full microCT STL set (head, eyes,
arista, antennal segments, thorax, halteres, all six legs' coxa→tarsus chains) and a working
MuJoCo-WASM `FlyStage`. The geometry for anatomy anchoring exists.

Proposed NEW visualizations (each: what it shows · page · data/asset · build · reuse):

1. **The four-part loop, anatomy-grounded (the hero of The Embodied Fly).** sense (looming on the
   eyes) → brain (spike propagates real wiring to the Giant Fiber) → descend (GF rate → escape
   command) → body (the bolt) → loop closes through physics; each stage lit on the actual animal.
   *Data:* head/eye/thorax STLs (bundled); GF/escape numbers from `escape_loop_report.md`. *Build:*
   SVG + React in the `EscapeCircuit`/`SystemDiagram` popout idiom; animate the spike along the
   LC4/LPLC2→DNp01 edge. *Reuse:* `EscapeCircuit` node/popout machinery wholesale.
2. **Brain-region map on a real brain layout.** Where LC4/LPLC2 (lobula VPNs, near the eyes) and
   DNp01 (descending toward the VNC) physically sit. *Data:* one dorsal-brain SVG silhouette to add +
   real synapse counts from `neurons_report.md` (right>left asymmetry); encode counts as edge
   thickness so "right GF out-fires left" becomes *visible*. *Build:* SVG, reuse `EscapeCircuit`
   popouts.
3. **The GF response curve (real EB-0B sweep) as an instrument.** input Hz → DNp01 rate (0 at rest →
   soft ceiling ~190 Hz), sub-additive summation, and a **silence-LC4/LPLC2 toggle** that collapses
   the curve to 0 (on-page proof of specificity). *Data:* the table in `neurons_report.md` →
   `public/cellular-gaits/data-eb/gf_response.json`. *Build:* `recharts` (matches `GainSweepChart`).
4. **Real-fly vs sim escape, side by side.** a reference Drosophila looming-takeoff beside
   `flee_left.mp4`/`flee_right.mp4`, the shared circuit labeled across both. *Build:* the existing
   `cg-perturb-clips` two-up layout; one reference asset, no new compute.
5. **Put the orphaned `PlantSchematic` on the Body page** (it already exists, is anatomy-perfect, and
   is imported nowhere). Pair with `BodyFlyDemo`. ~Zero cost, one import.
6. **"Sensors on the head/body" unifying map.** looming→eyes, odor→antennae, proprioception→legs —
   each as a bilateral L−R comparison drawn where it enters the animal; unifies the three behaviors
   under one motif. *Build:* SVG over a body outline, reuse `SensorOverlay` pattern.
7. *(optional, engineering credibility)* **"Built once, then stepped" timing instrument** — build
   ~3 s once, ~150 ms per 15 ms brain step (the make-or-break constraint). *Data:*
   `feasibility_gate.json`. Small SVG timeline.

## 4. Consistency fixes — required BEFORE the embodied section lands

So the new section is consistent with the project's own honesty brand, these existing claims must
change (they become stale/contradictory once the embodied work is on-site):

- **`ControllerLadder.tsx`** — rung 4 ("FlyWire VNC connectome / FRONTIER / dashed") is the wrong
  subsystem and wrong status. Retarget to the brain escape loop and mark it live (or add a 5th "live"
  rung). Reconcile its "structure → behaviour" claim with the report's careful framing ("a
  *direction we explore*, not a proven sufficiency claim," `REPORT.md` §7).
- **`controller/page.tsx` frontier** — "replace the rule with the real VNC leg connectome… see the
  Embodied tab." The VNC walker was never built; rewrite to point at the realized brain loop.
- **`mapping/page.tsx` frontier** — "descending-neuron readout… the interface Eon names as unsolved…
  a hand-wired stand-in" is now *exactly* what the embodied motor-map implements (DNp01 rate → drive,
  `DRIVE_PEAK=0.2`). Upgrade "someday" → "here's the realized version → The Embodied Fly."
- **`behaviors/escape/page.tsx` + `EscapeCircuit.tsx` seam** — flip future tense ("where a FlyWire
  sub-circuit *later* drops in," "drops in HERE") to present ("the real wiring **is** here"), link to
  The Embodied Fly. The green "OUR HAND-BUILT STAND-IN" rail is now only half the story.
- **`content/projects.ts`** — homepage card oneLiner/paragraphs/meta/RESULT lead with the embodied
  connectome, not "~29 mm/s gait."
- **The "NCA was always a placeholder for the brain" reframe** (the `EMBODIED_BRAIN_PLAN.md` thesis)
  is never stated on-site. Add the one line to Frame + Embodied/escape so the null-model → real-brain
  arc is legible — it's the PARTNER_BRIEF's stated through-line.
- **`SystemDiagram.tsx` / Appendix** — `SystemDiagram` has no brain/connectome loop (NCA+CMA-ES
  only); after embodied ships it's an incomplete "system at a glance." Add the brain↔body sync loop or
  scope its title to "the walking system." Cut/replace stale `BuildPlanDAG`.
- **Honesty parity:** the embodied `REPORT.md` ships strong caveats (isolated GF saturates → *not* a
  calibrated threshold; coarse 1-spike-per-15ms readout; hand-tuned sparse single-DN coupling;
  predicted-not-measured NT signs; inherited body asymmetry; ground-only, no true takeoff). The new
  section must carry these at the **same prominence** the existing behavior pages already give their
  caveats — surfaced, not buried — or it reads as overclaiming relative to the rest of the site.

## 5. Prioritized recommendations

| # | Recommendation | Type | Impact | Effort | File(s) |
|---|---|---|---|---|---|
| 1 | Rebuild `embodied/page.tsx` → the climax "Embodied Fly" page (four-part loop, real numbers, honest-limits panel) | structure+viz | High | L | `app/.../embodied/page.tsx`; `cellular-gaits/docs/embodied/REPORT.md` |
| 2 | New anatomy-grounded four-part-loop animation | new-viz | High | L | new `EmbodiedLoop.tsx`; `public/.../model/*.stl`; reuse `EscapeCircuit` |
| 3 | Rewrite Frame lede + tab index (lead with embodied; add Behaviors+Appendix) | semantic | High | S | `app/.../page.tsx` |
| 4 | Retarget `ControllerLadder` connectome rung → brain loop, mark LIVE; drop CPG | semantic+structure | High | M | `ControllerLadder.tsx` |
| 5 | Update homepage card to lead with embodied connectome | semantic | High | S | `content/projects.ts` |
| 6 | Fix stale frontier slots (Controller, Mapping) → realized brain loop | semantic | High | S | `controller/page.tsx`, `mapping/page.tsx` |
| 7 | Brain-region map (LC4/LPLC2/DNp01, synapse-weighted edges) | new-viz | High | M | new component; `neurons_report.md` data; reuse `EscapeCircuit` |
| 8 | Flip escape page + `EscapeCircuit` seam to present tense, link to Embodied | semantic | High | S | `behaviors/escape/page.tsx`, `EscapeCircuit.tsx` |
| 9 | Real GF response-curve instrument (with silencing toggle) | new-viz | Med | M | new `GfResponse.tsx`; new `data-eb/gf_response.json` |
| 10 | Carry `REPORT.md` honest-limits into the new section at equal prominence | semantic | High | S | `app/.../embodied/page.tsx` |
| 11 | Reorder Behaviors hub to lead with escape; demote navigation stub | structure | Med | S | `behaviors/page.tsx` |
| 12 | Put orphaned `PlantSchematic` on the Body page | new-viz (reuse) | Med | S | `body/page.tsx`, `PlantSchematic.tsx` |
| 13 | Merge Objective into Optimizer ("Search & Objective") | structure | Med | M | `tabs.ts`, `objective/page.tsx`, `optimizer/page.tsx` |
| 14 | Collapse Sensing's "can't run yet" into a direct open-vs-closed result | semantic | Med | M | `sensing/page.tsx`, `SensingModule.tsx` |
| 15 | "Sensors on the head/body" unifying L−R map | new-viz | Med | M | new component; reuse `SensorOverlay` + body STLs |
| 16 | Side-by-side real-fly vs sim escape clips | new-viz (reuse) | Med | S | `behaviors/escape/page.tsx`; `data-x/flee_*.mp4` + 1 asset |
| 17 | Cut/replace stale `BuildPlanDAG` | semantic | Med | S | `appendix/page.tsx`, `BuildPlanDAG.tsx` |
| 18 | Add brain↔body loop to `SystemDiagram` (or scope its title) | semantic | Low | M | `SystemDiagram.tsx` |
| 19 | Fix the blank Frame hero video (load bug) + de-dup with `CAPlayer` | UX/bug | Med | S | `app/.../page.tsx` |
| 20 | "Built once, then stepped" timing instrument | new-viz | Low | S | new small component; `escape_loop_report.md` §2 |

**Single highest-leverage move:** #1 + #2 + #3 together — a real, anatomy-grounded home for the
connectome escape loop as the climax, with the Frame re-pointed at it. The science is done and
honestly documented in `cellular-gaits/docs/embodied/`; the site just hasn't caught up.

## 6. Delegation plan (Cowork plans; Claude Code executes)

Sequenced work packages, each self-contained enough to hand to a Claude Code session. Gate the
embodied build on the data export so the new page references real artifact shapes.

- **WP-A — Narrative consistency pass (no new viz, no data dep).** Recs #3, #4, #5, #6, #8, #10
  copy/framing, #11, #17, #19. Pure content/structure edits on existing pages so the site stops
  contradicting the refocus. Ships independently and immediately. *Effort: M.*
- **WP-B — IA restructure.** Recs #13 (merge Objective→Optimizer), #14 (Sensing & Loop), tab
  reorder/rename in `tabs.ts`, move Embodied to penultimate. Mechanical but touches routing; do after
  WP-A so copy is already settled. *Effort: M.*
- **WP-C — Reuse-only viz wins.** Recs #12 (`PlantSchematic` on Body), #16 (side-by-side escape
  clips), #18 (`SystemDiagram` brain loop or retitle). No new data. *Effort: S–M.*
- **WP-D — Data export (the gate, runs on Mac).** `cellular-gaits/ops/prompts/PROMPT_eb_2a_simdata.md`
  → `scripts/export_embodied.py` → `public/cellular-gaits/data-eb/` (traces, clips, circuit JSON,
  `gf_response.json`, manifest). Heavy compute: run via `uv run` in a terminal, streamed. Reports the
  exact artifact schemas. *Effort: M; blocks WP-E.*
- **WP-E — The Embodied Fly climax page + new brain viz.** Recs #1, #2, #7, #9, #20. Built against the
  WP-D bundle shapes. The big one; do last. *Effort: L.*

Order: **WP-A → (WP-B, WP-C in parallel) → WP-D → WP-E.** Confirm the redesign direction (this doc)
before WP-E so the final piece lands consistent with the refactor — which was the explicit ask.

## Appendix — review provenance
- Code/content audit: all `page.tsx` under `app/projects/cellular-gaits/` + `layout.tsx`; all 34
  components in `components/cellular-gaits/`; `tabs.ts`; `content/projects.ts`; `public/cellular-gaits/data-*`;
  `PARTNER_BRIEF.md`, `VOICE_PROFILE.md`, `EMBODIED_BRAIN_PLAN.md`; the embodied report + deep-dives in
  `cellular-gaits/docs/embodied/`.
- Live-site grounding: rendered Frame, Embodied, Behaviors hub, Behaviors/Escape on vishal.pa.thak.io.
