# Embodied Brain Emulation — guiding plan

> **The refocus (2026-06-22).** The real goal of this project is to **recreate (and slightly extend)
> Eon's embodied virtual fly**: a real FlyWire connectome *brain* driving the NeuroMechFly *body* in a
> closed sensorimotor loop. Everything before this — walking, criticality, perturbation, chemotaxis,
> escape, navigation — was a toy/null-model that built the *story*, the *body + sensory plumbing*, and
> the *connectome-data pipeline*. The NCA controller was always a **placeholder for the brain**; now we
> put the real brain in.
>
> **The deliverable is a simulation + an explanatory report** that one can go through to understand
> every design decision, *why* it was made, and to build as much intuition about the simulation as
> possible. This is both the scientific finish of the arc and the strongest possible **eon.systems**
> career signal (it is, literally, a hand-built piece of what Eon does).
>
> Reference: Eon, ["How the Eon Team Produced a Virtual Embodied Fly"](https://eon.systems/updates/embodied-brain-emulation) (Mar 2026).
> Maintainer: Vishal. Status: **planning / Phase 0.**

## How we work now (this is the point, not a footnote)
**Understanding-first.** The prior phase drifted into fire-and-forget delegation, and Vishal ended up
out of the loop on decisions he should own. New mode:
- Explain each component *before* we build on it; no black boxes.
- Make the design decisions **together**, in chat, and log the *why* — that log **is** the report.
- Compute jobs (running the brain, training a controller) are plain scripts we watch live; agents are
  for code, not for babysitting background runs.
- Honesty is the brand (it's also Eon's): every choice ships with its caveat.

## The architecture — Eon's four-part closed loop
1. **Sense → identified neurons.** A world event activates *specific real sensory neurons* (taste GRNs,
   antennal mechanosensory neurons, visual projection neurons), addressed by FlyWire ID.
2. **Brain = a connectome LIF model.** Spikes propagate through the real FlyWire wiring; synapse signs
   come from predicted neurotransmitters. Read out the firing rates of any neurons.
3. **Descending neurons → motor commands.** A *small* set of real descending neurons (DNs) act as
   "control handles" (steer, forward, groom, escape, feed).
4. **Body = NeuroMechFly.** Low-level controllers turn DN signals into leg/joint motion in MuJoCo; the
   movement changes the sensory state → back to (1). Eon syncs brain↔body every 15 ms.

## The components — all open-source (feasibility CONFIRMED)
| Layer | What | Source | Status for us |
|---|---|---|---|
| **Body** | NeuroMechFly v2 (MuJoCo, 87 joints, micro-CT, vision+olfaction) | [NeLy-EPFL/flygym](https://github.com/NeLy-EPFL/flygym), [Wang-Chen 2024](https://www.nature.com/articles/s41592-024-02497-y) | **We already use it** (all of cellular-gaits) |
| **Brain** | Connectome LIF, ~140k neurons / ~50M synapses, FlyWire v783 baked in; **Brian2**; runs on a **laptop**; MIT | [philshiu/Drosophila_brain_model](https://github.com/philshiu/Drosophila_brain_model), [Shiu 2024](https://www.nature.com/articles/s41586-024-07763-9) | Drop-in; addresses neurons by FlyWire ID |
| **Brain (multi-backend)** | Same LIF across Brian2/CUDA/PyTorch/NEST/GeNN **+ neuromorphic chips** | [eonsystemspbc/fly-brain](https://github.com/eonsystemspbc/fly-brain) | Eon's *own* code — scale + the Loihi horizon |
| **Vision** | Connectome-constrained visual model (64 cell types), PyTorch; wired into NeuroMechFly | [TuragaLab/flyvis](https://github.com/TuragaLab/flyvis), [Lappalainen 2024](https://www.nature.com/articles/s41586-024-07939-3) | Available; "decorative" until we drive behavior with it |
| **Connectome data** | FlyWire v783 (neurons, connectivity, NT signs) | In the Shiu/Eon repos; CX-1 already extracted LC4/LPLC2→DNp01 | Have it |
| **Coupling** | sensory→activation, DN→motor, the closed loop | **Not open-sourced by Eon — we build it** | The novel contribution |

## The reframe: we build the *coupling*, not the brain
The brain is published, runnable on a laptop, and is exactly the kind of **LIF/SNN** Vishal built at Rain
and deployed on Loihi — the connectome just supplies the wiring instead of a schematic. Even Eon's *own*
public repo is brain + backend benchmarks, **not** the embodiment. The embodiment — how a looming event
becomes LC4/LPLC2 activation, how a DNp01 firing rate becomes a motor command, the closed loop — is the
"central difficulty" Eon names and **did not release.** So **our work is the part Eon left undone**, it's
an integration-and-intuition problem (Vishal's strength), and it's the heart of the report.

## The plan (phased, understanding-first)

### Phase 0 — Foundations & feasibility
Get the real components running and *understood*, before any coupling.
- Stand up [philshiu/Drosophila_brain_model] locally; run the example (activate neurons by FlyWire ID →
  read downstream rates); reproduce a known result (e.g. sugar GRN → feeding-circuit activation).
- Confirm the FlyWire IDs for **LC4, LPLC2, DNp01** (from CX-1) resolve in the model's v783 neuron list.
- Verify what NeuroMechFly provides for **takeoff/escape** body motion (vs. reuse the existing trained
  escape body behavior; vs. imitation-learn one). **The one real unknown.**
- Distill each key paper into the report's "components" section.
- **Done when:** Vishal can run the brain and explain the LIF mechanic + the four-part loop end to end.

### Phase 1 — Escape: the real connectome loop in miniature
The smallest faithful instance of Eon's loop (and one step *beyond* their public demo, which wired
looming→giant-fiber in the brain but never embodied escape).
- Looming front-end (size+expansion, exists) → **activate LC4 + LPLC2** by FlyWire ID at a looming-rate.
- Run the LIF brain → **read DNp01 (giant fiber) firing rate** (use the whole brain; just address these).
- **DNp01 rate → escape motor command → NeuroMechFly** bolt/takeoff.
- Log every interface decision (below). **Done when:** a looming stimulus, through the *real* connectome,
  makes the body escape — with the report section explaining each choice.

### Phase 2 — Scale toward Eon's integration
More sensory inputs and behaviors via the *full* brain: feeding (sugar GRNs → feeding circuit → proboscis
MNs), grooming (antennal mechanosensory → aDN), foraging; make **vision non-decorative**; tighten the
brain↔body sync. This is "more of the same wiring," not a new architecture.

### Phase 3 — The deliverable: the simulation + report (+ the neuromorphic horizon)
The pedagogical artifact: an interactive, browsable simulation + report that walks anyone through the
stack, every design decision, and the intuition. Stretch horizon (pure Vishal): run the FlyWire LIF brain
on **Loihi / neuromorphic** hardware — Eon's repo already targets it; this is the Rain/Loihi background
applied to a connectome, the strongest eon.systems signal.

## The design-decision log (the heart of the report)
Each is a hand-tuned approximation of the real motor hierarchy — stating *why*, and the caveat, is the work:
- **Sensory map:** looming magnitude → LC4/LPLC2 activation Hz (Eon: "at what rate should a stimulus
  activate sensory neurons" — hand-chosen).
- **Motor map:** DNp01 firing rate → escape command magnitude/direction/timing (Eon's "central difficulty").
- **Timescale:** brain↔body sync rate (Eon 15 ms; escape is fast — likely faster).
- **Whole-brain vs sub-circuit:** use the whole Shiu brain and address LC4/LPLC2→DNp01 by ID (faithful,
  cheap) rather than a hand-built sub-network.
- **Rate vs spiking:** resolved — the published model **is** spiking LIF; we use it directly.
- **Body controller:** reuse the existing trained escape motion vs. an imitation-learned takeoff (Phase 0).

## Honest limitations (carry these, like Eon does)
- LIF omits dendritic nonlinearities, channel diversity, plasticity, internal state, neuromodulation.
- The brain→body coupling is hand-tuned — an approximation of the true descending-motor hierarchy.
- The DN interface is sparse (a handful of DNs vs >1,000).
- "Structure → behavior" is a *direction we explore*, not a proven sufficiency claim.
- This is a research/demonstration platform, not a biologically complete fly.

## References
Eon post · Shiu et al. 2024 (Nature) · Dorkenwald et al. 2024 (FlyWire connectome) · Schlegel et al. 2024
(annotation) · Lappalainen et al. 2024 (vision) · Wang-Chen et al. 2024 (NeuroMechFly v2) · Eckstein et
al. 2024 (neurotransmitters) · Braun et al. 2024 (descending networks). Repos: `philshiu/Drosophila_brain_model`,
`eonsystemspbc/fly-brain`, `TuragaLab/flyvis`, `NeLy-EPFL/flygym`.
