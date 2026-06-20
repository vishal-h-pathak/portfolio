# Cellular Gaits — research roadmap (living doc)

> **Living ideas ledger.** Where the *science* of the project goes (distinct from
> `build-plan.md`, which tracks the *page* build). Every behavior, the bigger arc, the
> compute envelope, and how each lands on the site. Update as ideas land or change.
>
> Last updated: 2026-06-19 (chemotaxis → done (live) — CH-C live place-the-source demo + recorded headline landed)

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
| **Escape response** | looming detector (size + expansion, bilateral) | react fast + flee in the correct direction | maps to a real, mapped circuit (see below); short episodes = cheap; bridge to connectome | low | queued |
| **Obstacle navigation** | short-range distance "feelers" + goal bearing | reach goal, penalize collisions | fuses seek + avoid; most robot-demo-compelling | med | queued |

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
