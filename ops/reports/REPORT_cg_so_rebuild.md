# Search & Objective — full ground-up rebuild

**Branch:** `feat/cg-redesign` (worktree `cg-redesign`). Committed, **not pushed** — human QAs on
localhost and pushes. `npx tsc --noEmit` clean. Visuals verified against a throwaway dev server on
:3007 (then stopped, so nothing conflicts with the human's own server).

This was a rebuild, not a polish pass. I crawled the whole Cellular Gaits project first, derived what the
page *should* convey independently, and designed new visuals against the bar the strong components set
(`HeadingError`, `EscapeCircuit`, `EmbodiedLoop`, `SignalPathDiagram`). The old visuals were not anchored
on.

---

## My independent read — what this page must convey

The page sits at the "Search & Objective" tab: the project evolved a 660-parameter neural-cellular-automaton
controller with CMA-ES until the simulated fly walked (86.6 mm in a 3 s rollout, ~29 mm/s). There is no
dataset; the fly's own forward distance in contact-rich MuJoCo physics *is* the training signal.

A reader should leave with three things, in this order:

1. **Why it had to be search, not gradients.** The objective is a physics rollout — collisions, friction,
   stiff contacts — so `F(θ)` is non-differentiable. You can only *try* a controller and *measure* the
   walk. That single fact is the whole reason CMA-ES is on this page.
2. **What "good" was defined as.** One hand-set scalar: `F = forward thorax distance − 0.05·N_below`. A
   choice, not a law. (And honestly: the sag penalty never fired — `N_below = 0` everywhere — so in
   practice `F` was just distance walked.)
3. **That this worked** — and is distinct from the navigation-RL attempt elsewhere that did *not*
   generalize. The locomotion search succeeded.

The site's bar: *every visual ties a design decision to a visible behavior in the fly.* The old page
failed that bar (an abstract broken 2-D toy, a duplicated gain-sweep chart, the real climb buried last).

---

## The new composition, top to bottom (with rationale)

The module (`SearchObjectiveModule` in `optimizer/page.tsx`) is now a five-beat argument, each beat a new
server-rendered SVG/scorecard in the house idiom (no client JS — nothing can freeze the way the old toy
did, and every label is always visible / touch-safe):

1. **Framing — "It worked."** (`.cg-opt-framing`) Kept the success-up-front framing and the explicit
   "this isn't the navigation-RL experiment" disambiguation, tightened.

2. **§A · Why search, not gradients — `BlackBoxObjective.tsx`** *(new)*
   A pipeline tied to the fly: `θ` (660 numbers) → a 3-second MuJoCo black box with a walking fly inside
   and contact sparks → one scalar `F = 86.6`. Forward arrows are solid green ("try it" → "measure"); a
   dashed amber backward arrow labelled `∂F/∂θ` is struck through — "no gradient comes back; contacts
   aren't differentiable." This *is* the case for a gradient-free search, drawn rather than asserted.

3. **§B · What counts as a good walk — F formula + `FitnessAnatomy.tsx`** *(new scorecard)*
   The KaTeX `F` formula and gloss (reused the shared `.cg-mathblock` / `.cg-math-*` styles, untouched),
   then a scorecard in the `HeadingError` idiom decomposing `F` into its two terms, each tied to a fly
   behavior and shown with the champion's actual contribution: **Reward — forward distance** (`+86.6 mm`,
   "this drove the whole search") and **Penalty — sag guardrail** (`−0.00 mm`, "never fired — N_below = 0
   everywhere"). Footer states the honest consequence: the search was really just maximizing distance, and
   the objective is a choice (energy / symmetry / speed-matching would each pick a different gait).

4. **§C · The climb — `EvolutionClimb.tsx`** *(rebuilt centerpiece)*
   The honest `evolution.json` curve (best / mean / ±σ over 53 steps), now the lead visual instead of the
   afterthought it was. Cleaner geometry, larger, and the numbers are tied to *what the fly looked like*
   via three numbered milestones on the best curve — ① start (0.2 mm, "twitches, can't hold a stance"),
   ② first-run best (62.1 mm, "lurches forward, then stalls"), ③ overall best (86.6 mm, "clean walk ~29
   mm/s") — keyed in the empty upper-left interior. Milestones are labelled by **role**, not generation
   number, because the resumed phase re-uses gen numbers (the same reason the x-axis is "step"). The
   original→resumed warm-start is annotated honestly (phase labels + "warm-started from the gen-35
   checkpoint" parked along the empty low-fitness band at the bottom; legend moved to an HTML row under the
   chart to de-clutter the top strip). These three milestones are the **same** gen-0 / mid / late
   champions the footage slots below are reserved for — curve and (pending) clips read off one spine.

5. **§D · Watch it improve — `GaitGenerations.tsx`** *(honest placeholder — see compute follow-up)*
   The highest-impact visual the page *wants* (gen-0 stagger → mid lurch → late clean walk) as three
   side-by-side clips in the `GaitClips` 3-up idiom. **The footage does not exist and is not faked.** The
   slots are dashed "RENDER PENDING" frames with the ①②③ badges, fitness, and gait description, plus a
   "To be rendered — not faked" note describing the compute follow-up. I confirmed the data first
   (`evolution.json` carries only best/mean/std per step — **no per-generation thorax trajectories**), so
   the buildable top-down-trajectory proxy the prompt allowed is *not* possible from current data. Hence a
   labelled slot, not a proxy.

6. **Under the hood (demoted aside) — `SelectionRound.tsx`** *(replaces the broken toy)*
   A collapsible `<details>` aside, clearly "optional," holding a **static** fly-anchored picture of one
   CMA-ES round: candidate controllers sampled from the current distribution (amber ellipse), each scored
   by how far its fly walked, winners (green) pulling the search center forward, the distribution
   contracting toward what worked (dashed green ellipse), plus a numbered "one round, repeated ~50×" list.
   Static SVG, so it cannot freeze; fly-anchored ("each dot is one controller, scored by distance"), so it
   isn't the abstract Rosenbrock valley the old toy was.

The four-part explainer (chose / why / alternatives / frontier) was kept and tightened — stale references
to the removed gain-sweep chart dropped; the why now matches §A's argument.

---

## What I cut, and why

- **The 2-D CMA-ES toy (`ToyCmaEs.tsx`) — deleted.** It was broken (froze at "Gen 0 / σ 0.000 / PAUSED";
  the readouts read a ref that never re-rendered) and its control column wrapped one glyph per line, and it
  was conceptually disconnected from the fly. Replaced by the static, fly-anchored `SelectionRound`,
  demoted into the optional aside per the prompt.
- **The gain-sweep bar chart (`ObjectiveChart.tsx`) — deleted from this page.** Its x-axis is gain
  detuning of frozen weights — the *Controller's* edge-of-chaos story — not the search, and it duplicated
  `GainSweepChart`, which already lives on the Controller tab. Removed here; **the Controller page was not
  touched.**
- **`OptimizerModule.tsx` (held the old `EvolutionCurve`) — deleted.** Its honest content (the real climb)
  was rebuilt and promoted as `EvolutionClimb`.

All three deleted components were imported only by this page, and the `.cg-obj-*` / `.cg-opt-*` CSS they
used was exclusive to this page (verified by grep) — so replacing them stayed in lane.

---

## Files

**New components**
- `components/cellular-gaits/BlackBoxObjective.tsx`
- `components/cellular-gaits/FitnessAnatomy.tsx`
- `components/cellular-gaits/EvolutionClimb.tsx`
- `components/cellular-gaits/GaitGenerations.tsx`
- `components/cellular-gaits/SelectionRound.tsx`

**Rewritten**
- `app/projects/cellular-gaits/optimizer/page.tsx`

**Deleted**
- `components/cellular-gaits/ObjectiveChart.tsx`
- `components/cellular-gaits/OptimizerModule.tsx`
- `components/cellular-gaits/ToyCmaEs.tsx`

**CSS** — `app/globals.css`: replaced the now-dead `.cg-obj-*` block (ObjectiveChart) and the old
`.cg-opt-*` block (OptimizerModule/ToyCmaEs) with the new `.cg-opt-*` stylesheet (framing, section
headings, bordered figure stages, anatomy scorecard, footage slots, the collapsible aside, the
selection-round grid, and a small climb-legend row). The shared `.cg-mathblock` / `.cg-math-*` rules and
everything outside `.cg-opt*` were left untouched.

---

## Compute follow-ups flagged (no new compute done here)

1. **Per-generation gait footage (the big one).** Re-render the gen-0 / mid / late champions from their
   checkpoints with a **world-fixed camera** (so forward progress is visible), produce three short MP4s,
   and drop them into the `GaitGenerations` slots (replace the `PendingFrame` with `<video>`, same as
   `GaitClips`). This is the single highest-impact addition the page is missing. Runs on the WIN box.
   - Suggested checkpoints to match the climb's ①②③: gen-0 champion (≈0 mm), the first-run best near the
     ~62 mm stall, and the gen-50 champion (86.6 mm).
2. *(Optional, smaller)* If per-generation thorax trajectories are ever exported, a top-down
   trajectory-trace proxy in the `HeadingError` SVG idiom could stand in for the footage in the interim.
   Not buildable from the current `evolution.json` (best/mean/std only).

## Notes / out-of-scope observations (not changed)

- The Controller tab still owns the gain-sweep + gait clips; nothing there was touched. The cross-links
  between the two tabs remain coherent.
- No shared infra (`lib/mujoco-fly.ts`, `FlyStage`) or `globals.css` rules outside `.cg-opt*` were
  touched.
