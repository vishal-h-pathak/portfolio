# R3b — Methodology pages (Controller · Mapping · Search & Objective)

Branch `feat/cg-r3b` (isolated worktree). Per-page intuition pass against
`REVISION_PLAN_R2.md` §2 + §1F. The recurring complaint these three pages drew:
the numbers/visuals don't explain themselves or connect to the fly. The bar held
throughout: every number/control gets a plain "what it is / why it's here," every
visual ties to a *visibly identifiable* fly behavior, and anything needing new
rendered fly footage is flagged as a compute follow-up, **not faked**.

`npx tsc --noEmit` clean. Did **not** run `next dev` / `next build` (symlinked
node_modules breaks Turbopack) — human validates on `localhost:3000`. Not merged,
not pushed.

---

## Controller (`controller/page.tsx`, `CriticalityPlayground.tsx`, `GainSweepChart.tsx`)

**Tasks 1–4.**

- **Explained every number (Task 1).** Added a "Reading the dials" panel under the
  playground that gives a plain *what-it-is / why-it's-here* for the channel grid, λ
  (Lyapunov), the state-change rate, the sensitivity map, and the log(d/ε) trace —
  and states the through-line: λ=0 is the gait cliff, distance peaks just inside the
  ordered side and collapses the moment λ tips positive.
- **The flat log(d/ε) plot (Task 1).** Reframed rather than removed: explained that in
  the ordered regime the two trajectories stay locked, so the trace sitting flat on the
  zero line *is* the ordered signature — not a dead plot — and lifts off past the edge.
  Caption updated ("flat = order").
- **4×4 channel grid (Task 2).** Stated plainly what it is (4 state channels, 2×2, ch0
  → motors). Made the regime cue visible two ways: the grid frame now tints with the
  live regime color, and the copy points to where the regime *actually* shows — the
  sensitivity map (dark→lit) and the live body — being honest that the raw channels look
  similar across gains *because the rule is saturated* (the same fact that makes the
  state-change rate useless for locating the edge).
- **Control audit + settle-lag (Task 3).** Added a one-line "what each control does"
  (gain / presets / play-pause-step / reseed / reset λ) and the deferred settle-lag copy:
  every gain change restarts λ's average, so the dials take ~2–3 s to re-settle —
  they're re-measuring, not stuck — and the live body re-poses instantly.
- **Edge-of-chaos → good gait, on the fly (Task 4).** The ordered/peak/chaos gait clips
  already exist (`GaitClips`, gain-detuned low/native/high). Added framing copy on the
  page tying the three clips to the gain axis: low = over-damped plod, native = the clean
  ~29 mm/s walk just inside the edge, high = shakes apart in chaos. **No compute
  follow-up needed here** — the clips cover it.
- De-leaked the internal codename "**D**" (QA nit) → "the real MuJoCo physics / engine."

## Mapping (`mapping/page.tsx`, `MotorMap.tsx`)

**Tasks 5–6.**

- **Explained the module + grid/rescale equations (Task 5).** Added a plain-language
  intro: the 8×8×4 grid → read ch0 of the 7×6 block row-major → 42 numbers → actuator
  targets, with `clip(u,−1,1)·3.14 rad` glossed as "unitless −1…1 output → a joint angle
  of ±180° the engine drives toward."
- **Explained the slider + defined "override" (Task 5).** The override panel now leads
  with a definition: pin a cell, then the slider *overrides* it — forcing that one
  joint's target instead of letting the evolved rule set it, while the other 41 keep
  walking. The slider's `u` and the rescale to radians are spelled out.
- **Affected-joint visual under the slider (Task 5).** Added a small top-down fly glyph
  beneath the override slider that highlights the pinned leg + joint node and labels it
  ("affecting left front · coxa·yaw"), so the abstract index `i` lands on real anatomy.
- **Promoted the Alternatives (Task 6).** Added a prominent callout in the module body
  (not buried in the explainer grid): learned readout, population code, and the real
  descending-neuron interface — with the note that the descending version is already
  realized (DNp01 → escape drive) and a direct link to the Embodied tab.

## Search & Objective (`optimizer/page.tsx`, `OptimizerModule.tsx`, `ToyCmaEs.tsx`, `ObjectiveChart.tsx`)

**Tasks 7–10.** (`EvolutionCurve` lives inside `OptimizerModule.tsx`, not a separate file.)

- **Reframed as "this worked" (Task 7).** Added a "What we tried, and how it went"
  framing block up top: it worked — CMA-ES tuned the 660-param NCA from a stagger to a
  clean **86.6 mm/3 s ≈ 29 mm/s** walk, no gradients. Explicitly distinguished from the
  **navigation RL** attempt that did *not* generalize, so the page reads as a success,
  not a failure.
- **Readable gain graph (Task 8).** Added a persistent variable key under the bar chart
  defining every symbol and its implication (gain g, distance, N_below, penalty, fitness
  F) so it no longer needs a hover to be legible.
- **Plain-language CMA-ES toy (Task 9).** Rewrote the opaque "watch the green covariance
  ellipse rotate" blurb: dots = candidates this round (green = best), the ellipse = the
  search's current guess about where good candidates live (stretches along what's paying
  off, shrinks as it gets confident), clustering on the bright valley *because that's
  where the good scores are*. Added a one-line "what this is" (a 2-D stand-in for the
  660-D fly search) and rewrote the caption.
- **Fly connection + compute flag (Task 10).** Connected the EvolutionCurve to the fly in
  words: each step = one generation of 32 candidates; the best curve climbing 0 → 86.6 mm
  *is* the walk getting better (gen-0 topple → late-gen clean gait). Linked to the final
  recorded gait on the Controller tab.
- De-leaked "D" in a comment.

---

## Compute follow-ups flagged (not faked)

1. **Per-generation gait clips for Search & Objective (Task 10).** No early/mid/late-
   generation fly footage exists today — only the final-champion clips and the gain-sweep
   clips. Flagged on-page and here: re-render the **gen-0 / gen-20 / gen-50 champions**
   from their CMA-ES checkpoints so the gait visibly improves across generations. For now
   the page connects search → fly in words + the existing EvolutionCurve.

*(Task 4's ordered/critical/chaotic clips were already rendered — `GaitClips` — so no
follow-up was needed there; only copy tying them to the edge-of-chaos result.)*

## Notes

- CSS additions are appended in clearly-commented `R3b` blocks within the existing
  per-section CSS in `app/globals.css` (reusing site tokens). Kept tight to minimize
  conflicts when the four branches merge into `feat/cg-redesign`.
- Did not touch shared infra (`lib/mujoco-fly.ts`, `FlyStage`), `GaitClips`,
  `ConceptScaffold`, or `Math` — all outside the owned set.
