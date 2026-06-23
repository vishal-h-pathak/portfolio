# SYNC — cross-machine live state board

> **The heartbeat.** Read this FIRST at the start of any session (Mac or Windows, Cowork or
> CLI). Update it LAST and commit it with your work. It answers "what's running where, on which
> branch, and what's next" so two machines never clobber each other. Protocol + setup live in
> `CROSS_MACHINE.md`. Append to the sync log; keep the tables current (overwrite the cells).
>
> Convention: machines are **MAC** (MacBook Air, cockpit) and **WIN** (5900X workstation,
> compute). Either can do either role; the rule is one branch advanced from one machine at a time.

> **REFOCUS (2026-06-22): the project is now recreating Eon's embodied brain emulation** — a real
> FlyWire connectome **LIF brain** driving the **NeuroMechFly body** in a closed sensorimotor loop.
> Guiding plan: `EMBODIED_BRAIN_PLAN.md`. The prior behaviors (walking/criticality/perturbation/
> chemotaxis/escape/navigation) were toys/null-models that built the story + the body/sensory/
> connectome plumbing; the NCA was always a placeholder for the brain — now replaced by the real
> connectome. Deliverable: a **simulation + explanatory report**. Working mode: **understanding-first.**

## Active claims (who is advancing what — set before you start, clear when you stop)

| Repo | Branch | Claimed by | Status | Notes |
|------|--------|-----------|--------|-------|
| cellular-gaits | `feat/n-rl-navigation` | _unclaimed (the trunk)_ | **Embodied-brain Phase 0 DONE — EB-1 next (Mac)** | The consolidated trunk: nav-RL + `ops/` + CX-1 + embodied-brain (`brain/`, `embodied/`, `brain/neurons.py`) all merged. Next: **EB-1 coupling** (`ops/prompts/PROMPT_eb_1_coupling.md`, single Mac session). |
| cellular-gaits | `main` | — | production base, **~30 commits behind the trunk** | Consolidate `feat/n-rl-navigation` → `main` as a deliberate reviewed merge when ready. |
| portfolio | `main` | — | production | walking/criticality/perturbation/chemotaxis/escape behaviors live on the site. |
| portfolio | `feat/dual-machine-watcher` | _unclaimed_ | watcher/streaming + EB docs | `run-v`/`peekv`/`runi` + `render-stream.py` + the embodied-brain plan doc live here. |

## Current project state (one glance)

- **Embodied-brain Phase 0 — DONE** (all merged on `feat/n-rl-navigation`, Mac, **verified live**):
  - **EB-0A brain** — vendored the published Shiu connectome LIF (**138,639 neurons**, FlyWire v783) +
    a clean `BrainModel` API (`activate`/`silence`/`run`/`step`; persistent network). Proof-of-life:
    sugar GRNs → feeding motor neuron MN9 **0 → ~80 Hz**, causal. `docs/embodied/brain_explainer.md`.
  - **EB-0C body** — `apply_escape(env, drive, direction)` reusing the **trained X-A escape controller**
    (no retrain); directed, upright, bit-reproducible bolt. The scalar `drive` is the **DNp01 seam**.
    `docs/embodied/body_explainer.md`.
  - **EB-0B neurons** — LC4/LPLC2/DNp01 all resolve in v783; brain-only **looming→giant-fiber** check:
    driving LC4+LPLC2 fires DNp01 (~190 Hz, **sub-additive size+velocity** matching von Reyn/Ache,
    specificity clean, R>L matching CX-1 synapse counts). `docs/embodied/neurons_report.md`.
    **Honest caveat:** the isolated GF *saturates* (no whole-brain inhibition); in-vivo selectivity
    lives in the whole-brain context this check strips away — don't read the curve as an escape threshold.
- **Both halves of the escape loop are now proven independently** — EB-1 connects them.
- **KEY EB-1 constraint:** brain network build ≈ **7 min** (loads the ~100 MB connectivity table), so the
  closed loop **must build once + `step()` with a runtime-settable input rate**, never rebuild per window.
- **Navigation — RL pivot did NOT generalize; off the critical path, shipped honest.** The RL *harness*
  (env+policy+ppo) was built + validated (the real payoff); the controller extends homing within the
  forager's ~40° cone but not omnidirectionally from the warm-start (2b/2c/2d probes — flat outside the
  cone even obstacle-free). Nav is a documented demo, not the milestone. The connectome is the endgame.
- **Repo consolidated** (`ops/consolidate.sh`): stale branches deleted, EB+CX merged; `feat/n-rl-navigation`
  is the single trunk.
- **Fleet/cockpit:** `claude` is on sentry; delegated `cg run`/`run-v`/`runi` work. The Fleet Mission
  Control dashboard + the dual-machine watcher are a **separate project** (`fleet-mission-control`).

## Handoff queue (next actions, in order)

1. **EB-1 — the escape coupling** (Mac, single session, `PROMPT_eb_1_coupling.md`): wire looming →
   LC4/LPLC2 (brain) → DNp01 rate → `drive` → body escape, **build-once + step**, then STOP at the three
   interface-map decisions (sensory Hz, DNp01→drive, sync rate) for Vishal's review.
2. **Decide the interface mappings** with Vishal (the design-decision log / report content).
3. **Phase 2** — more sensory inputs + behaviors via the full brain; make vision non-decorative.
4. **Phase 3** — the **simulation + report** deliverable; stretch horizon: the FlyWire LIF brain on
   **Loihi / neuromorphic** (Eon's repo already targets it — Vishal's Rain/Loihi background).
5. **Consolidate `feat/n-rl-navigation` → `main`** as a deliberate reviewed merge.

## Cross-machine system build (this session)

Building Layer 1+2+3 (git+SYNC / Tailscale+SSH / W&B), both-machines-both-roles. Files added:
`CROSS_MACHINE.md` (playbook+setup), this `SYNC.md`, `CLAUDE.md` rule blocks (both repos),
`cellular-gaits/PROMPT_wandb_integration.md`. **User to-do on WIN:** install Claude Code CLI
(native, `irm https://claude.ai/install.ps1 | iex` + Git for Windows), clone both repos,
`uv sync`; then Tailscale on both + OpenSSH on WIN; then W&B account + run the wandb prompt.

## Cockpit / workstation operation

Once Tailscale+SSH are up (`cellular-gaits/WINDOWS_SETUP.md` Tier 1), drive the box from the Mac:
`portfolio/cockpit.sh` — `./cockpit.sh nav` starts this paused run detached; `logs`/`attach`
monitor it; `run <repo> "<directive>"` dispatches a delegated Claude CLI session on the box;
`pull` syncs results back to the Mac. **Observability loop:** `./cockpit.sh peek <name>` mirrors
the box's job log into `cellular-gaits/outputs/remote-logs/` (gitignored) so Cowork/Claude can
Read it on the Mac — no transcribing. Big artifacts: `./cockpit.sh artifact <relpath>`. Mac push:
`portfolio/push-cross-machine.sh`.

## Sync log (append-only, newest at top)

- **2026-06-22 (MAC / Cowork) — REFOCUS to embodied brain emulation; Phase 0 DONE; repo consolidated.**
  Pivoted the whole project to recreating Eon's embodied fly (real FlyWire connectome LIF brain →
  NeuroMechFly body), after researching the Eon post + FlyGym/FlyWire and finding every component is
  open-source (Shiu `Drosophila_brain_model`, Eon `fly-brain`, `flyvis`, `flygym`) and the brain runs on
  a laptop. Wrote `EMBODIED_BRAIN_PLAN.md`. Built + **verified live** Phase 0 on the Mac: **EB-0A** brain
  (138,639-neuron Shiu LIF + `BrainModel` API; sugar→MN9 0→~80 Hz), **EB-0C** body (`apply_escape` reusing
  the trained X-A controller; directed upright bolt; `drive` = the DNp01 seam), **EB-0B** neurons
  (LC4/LPLC2/DNp01 resolve in v783; looming→giant-fiber fires ~190 Hz, sub-additive, clean specificity;
  honest caveat: isolated GF saturates, selectivity is whole-brain). Explainers tracked in `docs/embodied/`.
  Nav RL shipped-honest (didn't generalize omnidirectionally; harness was the real payoff). Consolidated
  the repo (`ops/consolidate.sh`): deleted stale branches, merged EB+CX, single trunk `feat/n-rl-navigation`.
  Cleared a memory-pressure crash issue (too many stale Claude sessions on the Air). NEXT: **EB-1 coupling**
  (build-once+step; STOP at the interface decisions).
- **2026-06-22 (MAC / Cowork) — done-mask verified; repo reorg into `ops/`; connectome endgame
  begun (CX-1 staged) alongside the nav wave-2 calibration.** (1) **Verified** `rl/ppo.py`'s
  done-mask reset is rank-generic for the `(B,4,8,8)` CA state (`done_view = (n_envs,)+(1,)*rank`
  broadcasts; both `torch.where` branches checked) — the last open code gate is cleared, no fix
  needed. (2) **Repo cleanup:** all `PROMPT_*.md` / `setup-*.sh` / `REPORT_*.md` moved off both
  roots into `ops/` (cellular-gaits: `ops/prompts/{,archive}` + `ops/reports/`; portfolio:
  `ops/prompts/{,archive}` + `ops/waves/{,archive}`); `cockpit.sh`/`push-cross-machine.sh` stay at
  root; convention recorded in both `CLAUDE.md` + `ops/README.md`. (3) **Claude is now on sentry** —
  CLAUDE.md updated; delegated `cg run` box sessions work. (4) **Staged the parallel wave**
  (`portfolio/ops/waves/setup-cx-calibrate.sh`): nav RL integrate+calibration **on sentry** (amended
  `PROMPT_n_rl_2_integrate.md` — `w_collide`≈0.75, Newton cap dropped, report → `ops/reports/`) +
  **CX-1 connectome extraction on the Mac** (new `PROMPT_cx_1_extract.md`, feat/cx-connectome
  worktree). Both validation-gated (STOP before full run / before bulk pull). NEXT: commit on
  feat/n-rl-navigation, run the wave, claim both branches here. Reframe locked in: the connectome
  endgame plugs into **escape's** LC4/LPLC2→DNp01 seam (not nav) and reuses the nav-built harness.
- **2026-06-22 night (MAC / Cowork) — wave-1 RL harness COMPLETE + obstacles made PHYSICAL;
  consolidating onto `feat/n-rl-navigation`.** All three parallel chunks landed: **1b policy**
  (`NCAPolicy`, recurrent Gaussian, CA-state threaded, feeler gain policy-side, A/B max|Δ|=0;
  `feat/n-rl-policy`) and **1c ppo** (task-agnostic recurrent PPO — opaque per-step state stored +
  reset-on-done + free shuffle; Pendulum-validated; `feat/n-rl-ppo`) joined **1a env**. A
  **code-investigation agent** proved the obstacles were sensed-only (FlyGym fly geoms are 0/0; no
  fly↔obstacle `<pair>`), so N-A's "physical pin / Newton cap" rationale never applied and the
  grazing was a soft-penalty artifact. Vishal chose **real physics**: **N-RL-PHYS** (09cb896) added
  explicit fly-geom↔obstacle contact pairs — validated blocking, no tunneling to ~13× gait speed,
  no-obstacle A/B byte-exact; collision metric now real contacts. Findings carried to wave 2:
  `w_collide`→~0.5–1.0 (real counts 11–28/ep), Newton cap likely removable (pin didn't explode),
  reset≈250 ms / physical episode≈2.5–4 s. **Tonight's wrap-up** (`PROMPT_n_rl_wrapup.md`): commit
  the stray N-A recalibration for-record, merge env+policy+ppo into `feat/n-rl-navigation`, reconcile
  `uv.lock`, prune worktrees, commit the updated docs. NEXT: verify the done-mask rank-genericity,
  then wave-2 integrate (calibration on sentry). Resume: `NEXT_SESSION.md`.
- **2026-06-22 (MAC / Cowork)** — **N-RL-1a (the RL env chunk) built on `feat/n-rl-env`, Gate 1
  PASS, committed (not merged).** `src/cellular_gaits/rl/{env_base,nav_env,__init__}.py` +
  `gymnasium` dep — `EmbodiedRLEnv(gymnasium.Env)` (policy-agnostic, 4 pluggable hooks) +
  `NavRLEnv`/`NavRLConfig`. Contract for 1b/1c: obs `Box(6,8,8)` (feelers **raw [0,1]**; the ×8
  input gain moved to the **policy** side, 1b applies it), action `Box(-1,1,(42,))`→`FlyEnv.step`,
  reward = Δapproach − w_collide·contact − step_cost (+reach_bonus **gated collision-free** — fixes
  N-A's grazing), DR resamples bearing+obstacle+radius with a **frozen held-out set + rejection-
  sampled training disjointness** (0/5000 leaks). Gate 1: shapes/spaces OK, vector envs
  bit-deterministic, **reset ≈250 ms vs step ≈2.6 ms** (the RL throughput ceiling — reset rebuilds
  FlyEnv+warmup each episode; revisit with a movable-obstacle body if it dominates the full run).
  **⚠ WIN to verify:** on MAC `flygym==2.0.1`, obstacle geoms **don't physically block** the fly
  (all fly geoms `contype=conaffinity=0`; 0/55 contact pairs touch the obstacle; fly walks through)
  — so the **40 s→7 s pin from `REPORT_n_a_calibration` is NOT reproducible on MAC**; the Newton cap
  is verified *applied* (obstacles-only) but bounds a ~0 cost here. Task is unaffected (obstacles
  are sensed-only: feelers + geometric time-in-contact). Since flygym is pinned + uv.lock committed,
  WIN *should* match — confirm whether physical blocking/the pin actually happens on sentry. Details:
  `cellular-gaits/scratch/nrl/REPORT_1a.md` + `gate1.md`. (Policy 1b + PPO 1c are the next chunks.)
- **2026-06-22 (MAC / Cowork)** — Nav full run **completed (gen70, best_fit 21.07) but OVERFIT**:
  trained detour_success 0.25, **held-out 0.00 (0/8 detour, 4/8 reach)** — memorized the 4 fixed
  layouts (calibration Gate 4 had flagged it: 0/48 both-sides detour). Root cause = 4 fixed layouts
  + the forager's narrow ~40° left-biased homing cone. **Decision (with Vishal): pivot navigation
  to RL** — PPO + domain randomization, built as the **reusable policy-agnostic harness for the
  connectome endgame** (nav itself is off the critical path; the harness is the real payoff). Wrote
  `cellular-gaits/PROMPT_n_rl_navigation.md` (validation-first). Added the **fly-anatomy
  visualization rule** to `PARTNER_BRIEF.md`. Noted the `cg run`/`claude`-not-on-sentry gap +
  ssh+tmux workaround. Export bundle for N-A sits on sentry `outputs/web_data_n/` (unpulled). NEXT:
  run the RL prompt on sentry, calibration-first. (Bundle export was done on sentry directly via
  the Python script, not the delegated agent.)
- **2026-06-21 night (WIN / sentry)** — Nav full run LAUNCHED on the workstation: run_id
  `2026-06-21T05-22-48Z`, pop48/gens70, tmux `nav`, logging to `~/cockpit-logs/nav.log`. gen0
  diagnostics confirm calibration (baseline reach=False, collides). Cockpit verified live
  (`cg check` reached sentry). Output block-buffered through tee (fixed in cockpit.sh for future
  runs via PYTHONUNBUFFERED=1). Leaving it overnight. NEXT: see `NEXT_SESSION.md`.
- **2026-06-21 (MAC / Cowork)** — Cross-machine system created (Layers 1–3 specced, Layer 1
  live). Added `WINDOWS_SETUP.md` (bare-metal bootstrap, tiered) + `cockpit.sh` (Mac→WIN remote
  control). Escape confirmed shipped to production. Nav full run reassigned MAC → WIN (compute
  cliff). This board initialized. Next: WIN runs the nav evolution (`cockpit.sh nav` once SSH up,
  or directly per WINDOWS_SETUP Tier 0).
