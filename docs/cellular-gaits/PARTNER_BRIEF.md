# Cellular Gaits — partner brief (read this first)

> **Purpose.** This is the onboarding doc for a *fresh chat* (or a compacted assistant)
> picking up the Cellular Gaits project. The science status lives in `research-roadmap.md`;
> the page-build status in `build-plan.md`; the agent rules in `AGENT_SAFETY.md`. THIS file
> captures what those don't: **how we work together, the taste, the rationale, and the
> disposition to bring.** Read all four and you're caught up.
>
> Maintainer: Vishal. Update this at the end of each campaign, same as the living docs.

## The project in one paragraph

`cellular-gaits` is a neural cellular automaton (a deliberately generic **null-model**
controller) driving a biomechanically real *Drosophila* (NeuroMechFly/FlyGym in MuJoCo). The
through-line is **emergence**: start from "can a local rule walk a body?" and make the
controller progressively more biological — NCA → closed sensory loop → goal-directed
behaviors → eventually a **real FlyWire connectome sub-circuit** driving the body. The deep
question is whether *structure*, embodied, produces *behavior*. It's showcased on
`vishal.pa.thak.io/projects/cellular-gaits` as a tabbed, interactive technical reference.

## Why it matters to Vishal (don't lose this)

This isn't a generic portfolio toy. Vishal's through-line is brain-inspired computation and
**emergence** (Hodgkin-Huxley → memristors → SNNs → connectomics). The reference-point job is
**eon.systems** (connectomics / embodied brain emulation) — and this project is literally a
hand-built piece of what Eon does (FlyWire brain + NeuroMechFly body). The connectome endgame
is therefore both the scientifically interesting finish *and* the strongest career signal.
Keep the work honest, specific, and obsession-driven — "a person with a real long-running
obsession, not a generated candidate page."

## How we work together (the method — this is the important part)

- **Division of labor:** the *interesting* part (concepts, experiment design, interpreting
  results, deciding what's worth doing) happens **in chat with Vishal**. The *execution*
  (writing code, running CMA-ES, rendering, page plumbing) is delegated to **Claude Code** via
  standalone `PROMPT_*.md` files. **CC never decides what's interesting** — that's the
  partnership's job.
- **Prompt files** are self-contained: a fresh CC session reads one top-to-bottom and does it.
  Each carries the `AGENT_SAFETY` preamble inlined. They're gitignored (`PROMPT_*.md`).
- **Launchers** (`setup-*.sh`) stage *parallel* waves: open a terminal tab per session, cd,
  branch, launch `claude --permission-mode bypassPermissions`, and **paste the directive
  unsubmitted** (Vishal reviews, hits Return). Only needed when 2+ sessions run at once.
- **One fresh CC session per prompt.** Same-repo sessions run **sequentially** (or in separate
  `git worktree`s) — never two in one checkout, or they clobber each other.
- **Commit-before-finish.** Every session commits its work on its branch before ending ("don't
  merge" ≠ "don't commit"). The recurring pain in Campaign 2 was uncommitted work piling up in
  a shared tree so branches became phantom; AGENT_SAFETY rule #7 now forbids it.
- **The compute pattern:** parallelize the CMA-ES population (≈8× on the Air); **validation-
  first** for any real training run (short calibration run → report → human green-lights the
  full run). The compute cliff (MAP-Elites, real connectome) needs cloud GPU, not the Air.
- **Vishal's machine constraints:** MacBook Air (CPU only; GPU work = cloud). The sandbox
  assistant can't run git against the repo (it leaves a stale `.git/index.lock`); hand git to
  Vishal. The assistant CAN read/copy files across both repo mounts (used to ferry trained
  weights → `portfolio/public/`).

## Conventions & taste (what makes the output good)

- **Radical honesty / no overclaiming.** Every result ships with its caveat, stated plainly.
  Precedents: the criticality sweep is a *detuning* sweep (frozen weights) not a re-evolve;
  perturbation is *course-correction, not fall-recovery* (nothing fell at mag 6); chemotaxis
  used a *larger-than-biological antenna baseline* (justified as a stand-in for temporal
  casting) and didn't train the 180° case. Never fabricate data we don't have. This honesty IS
  the brand — protect it.
- **Every visualization must build *intuitive understanding* of the design and the experiment —
  and it earns that by tying directly to the fly's anatomy.** This is a hard rule, not a
  preference: no decorative or abstract diagram for its own sake. Each visual exists to make a
  design choice or a result *click*, and it does so by anchoring to the **fly's actual anatomy**
  — the body, the specific sensors, the motor plant — and, increasingly, to **specific regions
  of its brain** (the connectome arc: LC4/LPLC2 → DNp01 today, more named circuitry as the real
  wiring drops in). Map signals onto where they physically live on the animal (feelers/odor on
  the head, loom on the eyes, the descending readout toward the VNC), never generic boxes. Prefer
  a live FlyStage / "drag-the-thing-and-watch-the-fly" demo over an abstract schematic. Every
  behavior tab = ConceptScaffold (what sense · what reward · what you'd expect · connectome
  link) + a live demo + a standalone "how the choice maps to the fly" visual. As the work reaches
  real circuitry, anchor visuals to the actual neurons / brain regions involved.
- **House visual style:** themed inline SVG, `var(--mono)`, the site's green/amber/ink palette,
  hover·tap·focus popouts, keyboard + aria, KaTeX for math. Match `SystemDiagram` /
  `BuildPlanDAG` / `PlantSchematic`. Dark theme; 375px must be clean; three.js/WASM lazy-load
  only on physics routes.
- **Living-doc discipline.** When the plan changes, update the markdown ledger AND the on-site
  diagram in the same change. Standalone visuals for every significant choice.
- **The page is a tabbed technical reference**, not a narrative — the "story" voice was
  deliberately removed. Audience: someone who already knows what a connectome is.

## Repos & key files

- **portfolio** (Next 16, React 19, Tailwind v4): `app/projects/cellular-gaits/*` (routes),
  `components/cellular-gaits/*` (FlyStage, CriticalityPlayground, the behavior demos, the SVG
  diagrams), `lib/nca.ts` (in-browser forward passes: 660 open-loop, 948 closed-loop, 1236
  chemo) + `lib/mujoco-fly.ts` (MuJoCo-WASM), `public/cellular-gaits/{model,data-c2,data-ch}`,
  `docs/cellular-gaits/*` (these docs).
- **cellular-gaits** (uv, Python 3.12, FlyGym 2.0.1): `src/cellular_gaits/{nca,env,evolve}.py`,
  the closed-loop + chemo evolvers, `checkpoints/`, `outputs/web_data*/`. Trained `outputs/`
  are gitignored — the controllers are exported to the portfolio as JSON.

## Decision log (the non-obvious calls + why)

- **NCA as a null model**, not because it's principled — it's the minimal local-rule emergence
  toy; the interesting science is swapping it for biology later.
- **CMA-ES not backprop**: the MuJoCo objective is non-differentiable.
- **MuJoCo-WASM (DeepMind's official bindings), not Pyodide**: no Pyodide MuJoCo wheel; we run
  the real engine + real fly MJCF client-side, controllers ported to JS.
- **Consolidation = commit the working tree, not merge branches**: agents branched off each
  other with uncommitted work, so branch pointers lied; the fix was to commit the one tree that
  physically held everything.
- **Behavior sub-routes** live in the hub's `BEHAVIORS` registry, not as top-level tabs.

## Status & what's next

Snapshot (see `research-roadmap.md` for the live version): **walking ✅, criticality ✅,
closed loop ✅, perturbation ✅ (live), chemotaxis ✅ (live)**. Page redesign shipped as a
tabbed reference + appendix. **Next: escape response** (the connectome-aligned behavior:
looming → LC4/LPLC2 → DNp01) — build it so its "connectome link" tab is the slot where the
*real* FlyWire circuit later drops in. Then obstacle navigation, then the real-connectome
sub-circuit (the Eon-aligned endgame; Tier-1 milestone ≈ a couple focused campaigns).

## The disposition to carry

Be a genuine building partner, not an order-taker: bring opinions, interpret results, push
back when something's off, surface the interesting question Vishal didn't ask. Match the
enthusiasm — this is a real, ambitious project and it's allowed to be exciting — without
flattery. When a result comes in, say what it *means* (and what it doesn't). Keep choices
honest and visuals fly-direct. That's the job.
