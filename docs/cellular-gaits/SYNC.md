# SYNC — cross-machine live state board

> **The heartbeat.** Read this FIRST at the start of any session (Mac or Windows, Cowork or
> CLI). Update it LAST and commit it with your work. It answers "what's running where, on which
> branch, and what's next" so two machines never clobber each other. Protocol + setup live in
> `CROSS_MACHINE.md`. Append to the sync log; keep the tables current (overwrite the cells).
>
> Convention: machines are **MAC** (MacBook Air, cockpit) and **WIN** (5900X workstation,
> compute). Either can do either role; the rule is one branch advanced from one machine at a time.

## Active claims (who is advancing what — set before you start, clear when you stop)

| Repo | Branch | Claimed by | Status | Notes |
|------|--------|-----------|--------|-------|
| cellular-gaits | `feat/n-navigation` | _unclaimed_ | **N-A baseline (overfit), parked** | best_fit 21.07; held-out 0/8. Kept as the CMA-ES baseline RL must beat (not shipped, not tossed). Bundle on sentry `outputs/web_data_n/` (gitignored; `cg artifact`). |
| cellular-gaits | `feat/n-rl-navigation` | _staged → sentry_ | **HARNESS BUILT + obstacles PHYSICAL + done-mask verified — wave-2 calibration STAGED** | env+policy+ppo merged; real contact pairs validated. **done-mask reset verified rank-generic for `(B,4,8,8)`** (last code gate cleared). Wave-2 integrate+calibration staged to run **on sentry** via `cg run` (amended `ops/prompts/PROMPT_n_rl_2_integrate.md`: `w_collide`≈0.75, Newton cap dropped). Claim for sentry when you launch the wave. |
| cellular-gaits | `feat/cx-connectome` | _staged → Mac_ | **NEW — CX-1 connectome extraction STAGED** | wave 1 of the connectome endgame: extract the real FlyWire LC4/LPLC2→DNp01 escape sub-circuit (`ops/prompts/PROMPT_cx_1_extract.md`). Data-only, validation-gated, runs on the Mac in a worktree off `feat/n-rl-navigation`. Claim for the Mac when you launch the wave. |
| portfolio | `feat/n-navigation-scaffold` | _unclaimed_ | committed (230c040), not shipped | hold until nav generalizes (RL); the scaffold stays, no live demo until a real result |
| portfolio | `main` | — | production | escape is live (shipped from `feat/x-escape-live`) |

## Current project state (one glance)

- **Escape — DONE, live in production.** `/behaviors/escape` shipped. Controller + demo + clips
  + trajectory map all on the main site.
- **Navigation — CMA-ES → RL pivot done; harness BUILT + obstacles now PHYSICAL.**
  - N-A (CMA-ES) overfit (held-out 0/8). Investigation found the obstacles were **never physical**
    (sensed-only; fly walked through; "collisions" geometric) = the grazing root cause. Kept as the
    documented baseline RL must beat.
  - **RL harness built tonight** on `feat/n-rl-navigation` (env+policy+ppo): `EmbodiedRLEnv` +
    `NavRLEnv` (domain randomization + frozen held-out), `NCAPolicy` (recurrent Gaussian policy,
    CA-state threaded, A/B bit-exact, feeler gain policy-side), and a task-agnostic **recurrent PPO**
    (the **reusable connectome harness** — Pendulum-validated). DR + a general feeler→action policy
    is the bet to fix the overfit and relearn omnidirectional homing.
  - **Obstacles made physically real** (Vishal's call): explicit fly-geom↔obstacle MuJoCo contact
    pairs; validated to block head-on with no tunneling to ~13× gait speed; no-obstacle physics
    byte-exact; collision metric now counts **real contacts**. (Findings: `w_collide` needs raising
    to ~0.5–1.0 for real counts; the Newton-cap "pin explosion" premise didn't reproduce — likely
    removable.)
  - N-B (scaffold): `feat/n-navigation-scaffold` (230c040), parked; no live demo until a
    generalizing result exists.
- **Root constraint (now being addressed, not worked around):** the chemo forager is a narrow,
  left-biased homer (~40°), which forced N-A's narrow training cone → overfit. RL with wide
  bearing randomization is the bet to dissolve it (subsuming the "omnidirectional forager" pass).
- **Standing rule added** (`PARTNER_BRIEF.md` → taste): every visualization must build intuitive
  understanding by anchoring to the fly's anatomy and, increasingly, specific brain regions.
- **Cockpit gap:** `cg run` (delegated Claude CLI) fails on sentry — `claude` not installed there
  (still an open WIN to-do). `cg nav` / direct `uv run` Python works. Run scripts directly via
  ssh+tmux (tee to `~/cockpit-logs/<name>.log` so `cg peek` sees them) until the CLI is installed.
- **Compute cliff reached:** `mj_step` is CPU-bound and heavy. CPU win = run on WIN now. GPU
  (3080 Ti) only helps via an MJX/Brax port (big rewrite, contact-rich sim is MJX's hard case,
  needs WSL2 for JAX) or the RL connectome endgame (PyTorch/CUDA, native Windows fine).

## Handoff queue (next actions, in order)

1. **Verify** `rl/ppo.py`'s done-mask reset is rank-generic for the `(B,4,8,8)` CA state (only
   tested at `(B,1)`). Shape assertion is enough; fix before any real PPO run.
2. **Wave-2 integrate** — `PROMPT_n_rl_2_integrate.md`: wire env+policy+ppo, `run_rl_navigation.py`,
   run the **4-gate calibration on the physical task**, STOP, write `REPORT_n_rl_calibration.md`.
   Raise `w_collide`≈0.5–1.0; consider dropping the Newton cap; pull `web_data_n` for the Gate-2
   baseline. Wire on Mac, **run the calibration on sentry** (artifacts + cores; ssh+tmux dispatch).
3. **Decide from the calibration:** short PPO run lifts held-out detour above the N-A baseline →
   green-light the full run, then live demo + ship. If not → ship N-A honestly / shelve and move on.
4. **The endgame the harness is for:** the **real FlyWire LC4/LPLC2→DNp01 connectome sub-circuit**
   (RL on the 3080 Ti) — plug a `ConnectomePolicy` into the same `rl/` env + PPO.
5. Optional enabler: the **omnidirectional forager** pass (RL may subsume it via wide-bearing DR).

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
