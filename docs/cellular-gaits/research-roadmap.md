# Cellular Gaits — research roadmap (living doc)

> **Living ideas ledger.** Where the *science* of the project goes (distinct from
> `build-plan.md`, which tracks the *page* build). Every behavior, the bigger arc, the
> compute envelope, and how each lands on the site. Update as ideas land or change.
>
> Last updated: 2026-06-20 (navigation → **building**: N-B stood up `/behaviors/navigation` — the seek-vs-avoid arbitration visual `FeelerField`, warm-start-from-chemo + feelers, honest about having no clean real-circuit seam)

## Thesis (the through-line)

The controller is a generic neural cellular automaton — a deliberate **null model**. The
payoff is making it progressively more biological (NCA → CPG → closed loop → real
connectome) and asking whether structure, embodied, produces behavior. Walking is solved.
The next leap is **goal-directed, sensorimotor** behavior: the controller must turn *what it
senses* into *what it does*. That requires closing the sensory loop — the shared
prerequisite for everything below.

## Compute envelope (what's feasible where)

- The cost is **#rollouts × optimizer**, not a single rollout (~30k physics steps ≈ ~2 s CPU
  on the Air at ~12k steps/s). v1 ran the CMA-ES population *sequentially* → ~1 hr.
- **Biggest free win: parallelize the population.** Each generation's candidates are
  independent — spread across ~8 cores → ~8× → that hour becomes ~8 min. Use this in every
  re-evolve from now on.
- **Air-feasible:** any single behavior with the small controller (~660 params + a few
  sensor channels) + parallel rollouts. Minutes to ~1 hr.
- **The cliff (needs cloud GPU — Colab/Modal, via MuJoCo MJX/Brax; Apple-Silicon GPU is not
  it):** MAP-Elites gait gallery (10k–50k evals), or a real connectome controller (1000s of
  params, where CMA-ES dies and you switch to RL).

## Behaviors ledger

All require the closed loop. Each becomes a page tab with a live FlyStage demo + a standalone
"how the choice maps to the fly" visual (the PlantSchematic/SystemDiagram house style).

| Behavior | New sense | Reward | Why it's interesting | Compute | Status |
|----------|-----------|--------|----------------------|---------|--------|
| **Perturbation / robustness** | proprioception (joint angles + foot contacts) | stay upright + hold heading after a shove / on rough ground | cleanest proof feedback matters; stark open-vs-closed A/B; cheapest | low | **chosen first** |
| **Chemotaxis / foraging** | bilateral odor/taste gradient (L−R antenna) | reduce distance to / reach the source | most "alive" story; emergent steering from a sensor asymmetry; mirrors Eon's foraging | low–med | **done (live)** |
| **Escape response** | looming detector (size + expansion, bilateral) | react fast + flee in the correct direction | maps to a real, mapped circuit (see below); short episodes = cheap; bridge to connectome | low | **done (live)** |
| **Obstacle navigation** | short-range distance "feelers" + goal bearing | reach goal, penalize collisions | fuses seek + avoid; most robot-demo-compelling; **no clean real-circuit seam** (the honest one — real avoidance is visual/optic-flow, the feelers are a robotics abstraction) | med | **building** |

### Chosen sequence & rationale

1. **Close the loop, proven by perturbation/robustness** (Campaign 2, wave 1). It builds the
   shared sensorimotor plumbing *and* is its own behavior *and* upgrades the Sensing tab +
   SystemDiagram (dashed feedback arc → solid). Highest leverage, lowest cost, de-risks the
   rest.
2. **Chemotaxis** — spend the closed loop on something alive (the flagship).
3. **Escape** — the connectome-aligned one.
4. **Obstacle navigation** — richest spatial behavior.

## The escape circuit (the real biology — why escape is special)

Escape is the behavior with the cleanest known wiring diagram, which is exactly why it's the
natural bridge to the connectome endgame:

- A looming object is detected by two types of **lobula columnar visual projection neurons**:
  **LC4** encodes the object's **angular velocity** (≈ linear), **LPLC2** encodes its
  **angular size** (≈ Gaussian).
- Both converge on the **Giant Fiber** descending neuron (**DNp01**) — ~55 LC4 + ~108 LPLC2
  synapses onto its lateral dendrite. The GF effectively **sums size + velocity**.
- The **timing of a single GF spike** sets the motor program: a **short** (fast, less
  stable) vs **long** (slower, more coordinated) **takeoff**.
- A second, **GF-independent** pathway drives slower/deliberate evasive maneuvers (turn-and-
  walk-away, evasive flight turns).
- The response is **direction-invariant** (works for any approach azimuth) via **bilateral**
  integration.

Our minimal model: a hand-built "looming front-end" (object angular size + expansion rate +
which side) → sensor channels into the grid — i.e. an LPLC2-like size channel and an LC4-like
velocity channel, bilateral. Reward = react fast + flee away. **The endgame:** replace the
hand-built detector with the *actual* LC4/LPLC2 → DNp01 wiring pulled from FlyWire — a
concrete, self-contained sub-circuit, far smaller than the whole VNC, making it the most
tractable "real connectome drives the body" demo.

Sources: Ache et al. 2019 (Current Biology, GF size/velocity encoding); von Reyn et al. 2017
(single-spike timing → short/long takeoff); directional-invariance work (JEB 2023); the eLife
descending-pathway map (Namiki et al. 2018).

## Page strategy

Keep the tabbed shell. Add a **Behaviors** group (new routes under
`/projects/cellular-gaits/behaviors/*`): a hub + one route per behavior, each = ConceptScaffold
(what sense · what reward · what you'd expect · connectome link) + **live FlyStage** of the
trained behavior + a **standalone explanatory visual** of the sense→action mapping. Closing
the loop also updates the existing **Sensing** tab and the **SystemDiagram** (feedback arc
goes solid). A roadmap visual (this ledger, as a behavior tree off "walking") should land in
the appendix.

## Bigger arc

NCA null model → CPG → **closed loop (now)** → behaviors → **real connectome sub-circuit**
(escape LC4/LPLC2→DNp01 is the most tractable entry) → toward the Eon-style embodied fly
(FlyWire brain + NeuroMechFly body). Neuromorphic tie-in: FlyWire connectome on Loihi 2.

## Changelog

- **2026-06-18** — Roadmap created. Four behaviors logged; sequence chosen (closed-loop +
  perturbation first, then chemotaxis, escape, navigation). Escape circuit documented.
  Compute envelope + parallelization policy recorded. Campaign 2 wave 1 specced
  (`PROMPT_c2a_closed_loop.md`, `PROMPT_c2b_behaviors_scaffold.md`, `setup-campaign2-wave1.sh`).
- **2026-06-19** — **Perturbation / robustness → done (live).** The closed loop is closed:
  proprioception (42 joint angles + 6 foot contacts) feeds two extra `conv1` input channels
  (6→16, 948 params, warm-started so sensors-zeroed == v1 open-loop at init). Trained with
  parallel CMA-ES against a calibrated lateral shove (magnitude 6, the smallest in the 50–67%
  open-loop-degraded band). **Result:** across 18 seeds the closed loop roughly **halves** mean
  post-shove heading error — **56.6° → 26.5°** — while making *more* forward progress after the
  shove (24.3 vs 20.8 mm); headline single shove (seed 202) **97° → 19°**. **Caveat (honest
  framing):** at magnitude 6 *neither* controller falls (both 100% upright), so the win is
  **course correction / disturbance rejection, not fall-recovery** — and "recovery rate/time" is
  a wash. Catching a fall would need a harsher regime or the uneven-ground variant (future). The
  closed-loop fitness scalar (69.97) is not comparable to v1's 86.6 (different objective). Landed
  on site as the live `/behaviors/perturbation` demo (shove + open/closed toggle), the recorded
  open-vs-closed clips, and a standalone heading-error visual; Sensing tab + SystemDiagram updated
  (feedback arc closed for this behavior, v1 walking still open-loop). Next: chemotaxis.
- **2026-06-19** — **Chemotaxis / foraging → done (live).** The flagship "alive" behavior is
  closed-loop and on the site. Two new chemo channels join the proprioceptive loop (controller
  grows **6→16 → 8→16**, 1236 params, warm-started from the closed-loop walker so it still walks
  and stays robust): the odor concentration at the **left** and **right** antenna, laid out
  topographically over the motor block, written into `conv1` every control step. The field is
  `C(p)=exp(−‖p−src‖/λ)`, λ=12; antennae sit forward 1.0 / lateral 2.0 from the thorax. **Result:**
  trained on three azimuths — source **ahead (0°), left (90°), right (270°)** — it **reaches the
  source on all three** (closest-approach 0.36 / 2.02 / 0.52 world units; 3/3), and the turn is
  **emergent**: nothing says "turn toward the stronger antenna," that reflex falls out of `cL − cR`
  under CMA-ES. **Honest caveats:** (1) the **2.0-unit antenna baseline is deliberately wider than
  biological** — at a realistic narrow baseline the per-step |cL−cR| (~0.02–0.04) is too weak for
  CMA-ES to exploit; 2.0 makes the cue ~0.07–0.26, standing in for the temporal **casting** a real
  fly uses to amplify a weak instantaneous gradient. (2) Only the symmetric **ahead/left/right**
  cases were trained; **180° (behind)** is out of scope (a ~180° U-turn inside the 3 s rollout) and
  stayed unreached — the headline is carried by the symmetric L/R pair. (3) Fitness scores
  **closest approach** (`d_start − min_dist` + reach bonus), a documented deviation from a literal
  end-distance reward: the warm-started walker overshoots, so closest-approach is what cleanly
  rewards how well it *steered*; arrive-and-stop is future work. The fitness scalar (21.08) is not
  comparable across behaviors (different objective). Landed as the live `/behaviors/chemotaxis`
  **place-the-source** demo (drag the food source; the fly turns toward the stronger side and walks
  to it), the two recorded approach clips (emergent turns both ways), and a server-rendered top-down
  trajectory map. Next: escape (the bridge to a real connectome circuit — LC4/LPLC2→DNp01).
- **2026-06-20** — **Escape → building.** Stood up `/behaviors/escape` (X-B, scaffold + visuals,
  no trained data yet). Centerpiece is the **connectome-bridge visual** (`EscapeCircuit.tsx`): the
  real circuit drawn as the amber backbone — looming → **LC4** (angular velocity) + **LPLC2**
  (angular size) → **Giant Fiber / DNp01** (sums size + velocity; single-spike timing → short/long
  takeoff) → motor/takeoff — with our hand-built stand-in (2 bilateral loom channels ↔ LC4+LPLC2,
  learned controller ↔ descending readout) mapped onto it, and an explicit dashed seam marking
  where the real FlyWire `LC4/LPLC2 → DNp01` wiring later drops in (Ache et al. 2019; von Reyn et
  al. 2017). House-style SVG + hover/tap/focus popouts, keyboard + aria, no three.js/WASM on the
  route. **X-A** trains the escape controller, **X-C** wires the live launch-the-threat demo + flee
  clips + trajectory viz into the placeholder slot. Then obstacle navigation, then the real-
  connectome sub-circuit (the Eon-aligned endgame).
- **2026-06-20** — **Escape → trained (X-A full run, live demo X-C next).** The connectome-aligned
  behavior has a working controller. Two bilateral **loom** channels join the proprioceptive loop
  (controller stays 8→16, 1236 params, warm-started from the closed-loop walker so loom-zeroed ==
  C2-A dynamics **bit-exact**): an LPLC2-like **angular-size** term + an LC4-like **expansion-rate**
  term, combined into one [0,1] magnitude per eye (`m = clip(size·θ/π + exp·min(1, rate/6), 0, 1)`),
  split L/R by bearing and written over the motor block each control step. Trained with parallel
  CMA-ES (pop 32, 50 gens, best fitness 13.23, 4.98× on 9 workers) against a **target-leading**
  threat (so a fly that keeps walking straight is hit from every azimuth and only a real maneuver
  survives). **Result — emergent directed escape:** the *same* controller turns **opposite ways** for
  opposite threats, driven purely by `loom_L` vs `loom_R` — left threat (90°) → bolt **right**
  (away-turn +2.07, 28 ms), right threat (270°) → bolt **left** (+1.48, 48 ms), head-on (0°) → escape
  by displacement. Escape/survival by azimuth: **untrained 0/3** (mean closest 1.6) → **trained 3/3**
  (mean closest 17.8); held-out azimuths {45°, 135°, 315°} also **escape 3/3** — survival
  generalizes beyond the trained panel. A/B and parallel checks bit-exact; flee clips turn opposite
  ways. **Honest caveats (all documented in REPORT_x_a.md):** (1) the looming front-end is
  **hand-built** — a stand-in for LC4/LPLC2→DNp01, not the real circuit (that swap is the endgame;
  the two loom channels are the clean seam); (2) **`loom_input_gain=8`** amplifies the [0,1] cue
  before conv1 because the warm-start gait is **bang-bang** (motors pinned at ±1), so an unamplified
  cue sits on a flat fitness plateau CMA-ES can't climb — the escape analog of chemotaxis's
  deliberately strong antenna baseline, A/B-preserving (amplifying zero is still zero); (3) **180°
  (behind) omitted** (needs a U-turn inside the ~1.2 s episode); (4) the escape fitness scalar is
  **not** comparable across behaviors. Data exported to `data-x/` (escape_controller.json + flee
  clips + trajectories + metrics). Next: **X-C** wires the live launch-the-threat demo + flee clips +
  top-down trajectory map into the `/behaviors/escape` placeholder, then **X-INT** consolidates. Then
  obstacle navigation, then the real FlyWire LC4/LPLC2→DNp01 sub-circuit (the endgame).
- **2026-06-20** — **Escape → done (live).** X-C wired X-A's trained controller into the live
  **launch-the-threat** demo and the guaranteed recorded headline at `/behaviors/escape`, replacing
  the X-B placeholder slot. `lib/nca.ts` gained the **escape path** (additive, all four existing
  controllers intact): `loadEscape` (collapses `conv2 [4][16][1][1]→[4][16]`, pulls v1 `motor_cells`,
  lifts the loom geometry + `loom_input_gain` from the export's `sensors` into a `LoomSensing` struct),
  a pure `loomSignal(...)` front-end ported verbatim from `sensors.loom_geometry`/`eye_projection`
  (θ = 2·atan2(R, d); rate = max(0, dθ/dt); m = clip(size·θ/π + exp·min(1, rate/6), 0, 1); loom_L =
  m·0.5·(1+sin φ), loom_R = m·0.5·(1−sin φ)), `stepEscape` (byte-for-byte the chemo step with the two
  **amplified** loom planes), and `makeEscapeController(angles, contacts, loomL, loomR)`. **A/B
  confirmed bit-exact:** the 8-channel forward pass with both loom planes zeroed equals the 6-channel
  closed-loop pass on the same conv1 weights (max abs diff = 0) — amplifying a zero loom is still zero.
  New **`EscapeDemo.tsx`** (`"use client"`, dynamic `FlyStage`, `ssr:false`): one live MuJoCo fly,
  azimuth buttons (front/left/right) + click-in-arena to launch from any bearing, a constant-velocity
  target-leading threat, a fly-centred top-down `<canvas>` arena, a bilateral `loom_L`/`loom_R` readout
  with an `aria-live` status (idle/incoming/hit/escaped), NaN self-heal, and a `flee_left.mp4` fallback.
  New server-rendered **`EscapeTrajectories.tsx`** (pure SVG, no client JS): small-multiple panels of
  the recorded rollouts, **trained {0,90,270}** separated from **held-out {45,135,315}**, each panel
  drawing the fly bolt (green), threat course (orange, nulls skipped), aim point + hit-radius ring,
  onset marker, and escaped/closest/away-turn — all read from `trajectories.json`/`escape_metrics.json`,
  nothing hard-coded. The route reads both JSONs server-side; the four honest caveats (hand-built
  front-end, `loom_input_gain=8`, 180° omitted, fitness not cross-comparable) are surfaced on the page.
  Behaviors hub: escape `building → live`. Clean at 375px; `npx tsc --noEmit` + `npm run build` green.
- **2026-06-20** — **Navigation → building.** Stood up `/behaviors/navigation` (N-B, scaffold +
  visual, no trained data yet) — the **synthesis** behavior: seek a goal **and** avoid obstacles.
  Centerpiece is the **seek-vs-avoid arbitration visual** (`FeelerField.tsx`): a top-down schematic
  with the fly homing on the **reused chemotaxis odor beacon** and two bilateral **feeler fans**
  (short-range obstacle proximity, L field vs R) reading a wall in the path. Geometry is **analytic**
  — real ray–circle casts → two emergent drives drawn as vectors: a **seek** vector (from the odor
  `L−R` asymmetry, toward goal) and an **avoid** vector (from the feeler `L−R` asymmetry, away from
  the wall), **summed** into the resolved **detour** heading. The dodge *direction* is **emergent**
  (falls out of `proxL − proxR`), the same bilateral-asymmetry motif as chemotaxis (turn *toward*
  odor) and escape (bolt *away* from loom); the twist is **arbitrating two competing drives**.
  Design: **warm-started from the chemotaxis forager** (feelers-off == the pure forager that walks
  into walls; avoidance is the *added* skill) + the feeler front-end. **The honest framing — no clean
  real-circuit seam.** Unlike escape (which maps onto the real LC4/LPLC2→DNp01 circuit), navigation
  has no biological seam: real flies avoid obstacles with **vision / optic flow**, not rangefinders,
  so the feelers are a **robotics abstraction** and the tab says so plainly, contrasted with escape's
  real seam — the most robot-demo-compelling behavior but the least connectome-aligned, a capability
  demo not a connectome bridge. **No fake circuit diagram** invented for it. Pure SVG, **no
  three.js/WASM** on the route; popout roles on all 8 parts, `role="img"` + `<title>`/`<desc>`,
  keyboard + aria. Placeholder slot for the live demo (`// TODO: N-C — live place-the-goal /
  drag-the-obstacles FlyStage + detour clips + trajectory viz`). **N-A** trains the navigation
  controller, **N-C** wires the live demo. Then the real FlyWire connectome sub-circuit (the endgame,
  via escape's seam — navigation stays a demo). Clean at 375px; `npx tsc --noEmit` + `npm run build` green.
