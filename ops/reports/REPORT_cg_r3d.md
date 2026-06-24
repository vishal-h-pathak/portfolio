# REPORT — CG Round 3 · WP3d · The other behaviors (Perturbation + Chemotaxis + Navigation)

Branch: `feat/cg-r3d` (isolated worktree, off `feat/cg-redesign`). **Not merged, not pushed.**
Portfolio content/explanation work — **reused existing data, no new compute.** The human
validates on `localhost:3000` and merges/pushes the four R3 chunks together.

Theme followed throughout: the fly's behavior is hard to *read* — every visual ties to a
visually identifiable behavior, its goal, and how well it's doing against that goal.

`npx tsc --noEmit` → **clean (exit 0).**

> **Constraint note:** the owned set is the three behavior sub-pages + 8 components. `globals.css`
> is **outside** that set, so no new CSS classes were added — the one new UI element (the
> perturbation objective scorecard) is built with inline styles using the existing house tokens,
> and everything else reuses existing classes.

---

## Files touched (all within the owned set)
- `app/projects/cellular-gaits/behaviors/perturbation/page.tsx`
- `app/projects/cellular-gaits/behaviors/chemotaxis/page.tsx`
- `app/projects/cellular-gaits/behaviors/navigation/page.tsx`
- `components/cellular-gaits/HeadingError.tsx`

`SensorChannels.tsx`, `PerturbationDemo.tsx`, `ChemotaxisDemo.tsx`, `ChemoTrajectories.tsx`,
`GradientField.tsx`, `FeelerField.tsx` were read and left as-is (the proprioception provenance
fix landed cleanest in the page copy that frames `SensorChannels`; see below). Did **not** touch
the escape sub-page or shared infra (`lib/mujoco-fly.ts`, `FlyStage`).

---

## Perturbation

**1. Surfaced the objective so "how well is it doing" is explicit (the key win).**
Previously the open-vs-closed difference lived as two diverging rays plus prose buried in the
explainer grid — you had to *infer* success. Added an **objective scorecard** directly under the
`HeadingError` ray diagram (in `HeadingError.tsx`, new inline-styled `ObjectiveScorecard`
sub-component) that grades **both controllers on the three terms the reward actually rewards**,
read live from `robustness_metrics.json`:

| objective | goal | open loop | closed loop | verdict |
|---|---|---|---|---|
| Hold your heading | end pointed where you started | 56.6° off | 26.5° off | ✓ closed holds ~2.1× tighter |
| Stay upright | don't fall | 100% | 100% | = both clear it — no fall at this shove |
| Keep moving forward | still cover ground after the hit | 20.8 mm | 24.3 mm | ✓ closed travels further |

This makes the **fall-avoidance** objective explicit *and* honest: at magnitude 6 neither fly
falls, so that term is a tie — which is exactly why the contest is heading retention, not
catching a fall. (The harsher regime that would actually threaten a fall is flagged as compute
follow-up below.) New props (`openUpright`, `closedUpright`, `openPostDx`, `closedPostDx`) are
read from the existing aggregate metrics — nothing hardcoded, no new data.

**2. Defined "on course" plainly.** New lead paragraph on the result section states it directly:
there is **no destination** — "on course" = the heading the fly was walking *before* the shove;
the task is heading retention, not reaching a place. Reinforced inside the SVG with a
`= heading before the shove` sub-label on the dashed reference line.

**3. Explained where the proprioception values come from (build understanding, not just labels).**
Expanded the "What proprioception feeds in" copy to trace provenance: the joint angles are
MuJoCo's `actuator_length` (the live length of each of the 42 leg actuators, which *is* the joint
angle), read out of the sim each control step via `sim.actuatorLengths()` and normalized `θ/3.14`;
the foot contacts are a boolean per leg from the sim's contact detection (`sim.footContacts()`),
`1` on stance / `0` in swing. Connects it to the behavior: a shove changes those numbers the
instant a leg lands wrong, and that's the signal the controller steers on.

## Chemotaxis

**4. Led with the live "antennae lighting up while approaching the source" visual.** Reordered the
module so `ChemotaxisDemo` (the live MuJoCo forager + draggable source, where the antenna dots
brighten with odor and the leading one goes green) is now the **headline**, retitled
*"Smell it out — live, in your browser."* The **movable source is kept** (drag / click / arrow
keys, unchanged). Demoted the static `GradientField` to the second slot, retitled
*"Why it turns: the cL − cR difference"* and reframed as the mechanism "frozen so you can see it,"
with a one-line forward-reference from the headline. Recorded both-ways clips and the top-down
trajectory map follow as the proof. Tidied the section intros so the live → mechanism → proof
narrative reads cleanly; removed the now-duplicate bottom live-demo block.

## Navigation

**5. Made the honest call to demote — did *not* ship a stub or fake a live demo.** Confirmed there
is **no navigation compute bundle** (`public/cellular-gaits/data-n*` does not exist — no trained
nav controller export, no recorded rollouts, no trajectories), so a real live place-the-goal /
drag-the-obstacles demo genuinely needs new compute. Accordingly:
- **Removed** the `// TODO: N-C … coming soon` placeholder stub.
- **Replaced** it with an honest callout (*"No live demo here — on purpose"*) that explains the
  analytic `FeelerField` above is real (true ray casts + true vector sums) but frozen; that a live
  demo would need a `data-n` bundle the same shape as `data-c2`/`data-ch`; and that rather than
  fake it, navigation stays the **exploratory, least connectome-aligned** behavior — a
  seek+avoid *synthesis* / robot-demo, shown analytically, with the live trained demo a **flagged
  compute follow-up**.
- Rewrote the "result" explainer line that previously promised the live demo was "coming soon" to
  match (flagged follow-up, deliberately not faked).

The analytic `FeelerField` (the real ray-cast arbitration visual + substantial explanatory
content) carries the page, so it is **not** a bare stub.

---

## Compute follow-ups flagged (no compute done here — these are the natural R2-WP2 work)

These are all **legible-camera re-renders / new precompute** for these behaviors, the same
bird's-eye / world-fixed + top-down + event-annotation + reward-readout treatment the embodied
clips already got (REVISION_PLAN_R2 §1A / §2 / WP2):

1. **Navigation `data-n` bundle (biggest).** Train a navigation controller *with the feeler
   inputs*, export it + recorded detour rollouts + top-down trajectories (mirror `data-c2` /
   `data-ch`). This is what unlocks the live place-the-goal / drag-the-obstacles demo and lets
   navigation graduate from analytic-only. Until then the honest demote stands.
2. **Perturbation legible-camera re-render.** The two recorded open/closed clips
   (`perturbation_openloop.mp4` / `perturbation_closedloop.mp4`) still render through the tracking
   camera, so "walks off course" vs "steers back" is harder to read than the scorecard now makes
   it sound. A bird's-eye / world-fixed re-render with the shove instant + original-heading line
   annotated would make the on-page clips match the data.
3. **A harsher perturbation regime for real fall-recovery.** The scorecard's "stay upright" row is
   a tie because magnitude 6 on flat ground never threatens a fall (`upright = 100%` both). A
   stronger shove and/or uneven ground (`uneven_ground` is already a config flag, currently
   `false`) would turn fall-avoidance into a *live* objective with a real open-vs-closed gap —
   a re-run + re-export, not a portfolio change.
4. **Chemotaxis legible-camera re-render.** Same tracking-cam issue on `approach_left/right.mp4`;
   a world-fixed view with the source + gradient + closest-approach marker drawn in would make the
   recorded approaches as legible as the live arena now is.

## Out-of-scope note for the human (not touched)
The Behaviors **hub** (`behaviors/page.tsx`) still labels navigation `status: "building"` →
renders as **"live soon."** That now slightly contradicts the honest-demote framing on the nav
page (live demo is a flagged follow-up, not imminent). The hub is outside this chunk's owned set,
so it was left alone — worth reconciling to e.g. "exploratory" when the R3 chunks are merged.
