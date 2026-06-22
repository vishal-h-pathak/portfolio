# NEXT SESSION — Cellular Gaits pickup (resume exactly here)

> For a fresh chat tomorrow. Tonight we consolidated the navigation→RL work; this file says the
> exact state and what to do next. Read order below.

## Read first (you'll be fully caught up)
1. `docs/cellular-gaits/SYNC.md` — live cross-machine state board (ground truth for branches/state).
2. `docs/cellular-gaits/PARTNER_BRIEF.md` — how we work, taste, disposition (note the standing
   **visualization rule**: every visual anchors to the fly's anatomy / specific brain regions).
3. `docs/cellular-gaits/research-roadmap.md` — the science ledger (behaviors, the bigger arc).
4. `docs/cellular-gaits/build-plan.md` — the page-build status.
5. `docs/cellular-gaits/CROSS_MACHINE.md` — the cockpit (`cockpit.sh`, aliased `cg`) + Mac↔sentry.

## Exact state at handoff (night of 2026-06-22)

- **Escape — DONE, live in production.**
- **Navigation — pivoted from CMA-ES to RL; the RL harness is built and the obstacles are now
  physically real. Consolidated on `feat/n-rl-navigation`.**
  - **Why the pivot:** the N-A CMA-ES run finished but **overfit** (trained detour 0.25, **held-out
    0.00**, 4/8 reach) — it memorized 4 fixed layouts. A code investigation then found the obstacles
    were **never physical** (sensed-only; the fly walked through, "collisions" were a geometric
    proxy) — the root of the "reach-by-grazing." So we (a) switched to **PPO + domain randomization**
    and (b) made the obstacles **truly block the fly**.
  - **Built tonight (all on `feat/n-rl-navigation`):**
    - `rl/env_base.py` + `rl/nav_env.py` — `EmbodiedRLEnv` (policy-agnostic Gym wrapper) + the nav
      task with domain randomization + a frozen held-out set.
    - `rl/policies.py` — `NCAPolicy` wrapping `NCA(nav=True)` as a **recurrent** Gaussian policy
      (explicit CA-state threading; feeler input gain lives here, default 8.0); A/B bit-exact.
    - `rl/ppo.py` — task-agnostic **recurrent PPO** (stored per-step opaque state, reset-on-done,
      free minibatch shuffle); validated on Pendulum. **This is the reusable connectome harness.**
    - **Physical obstacles:** real fly-geom↔obstacle MuJoCo contact pairs (mirroring FlyGym's
      ground contact). Validated: blocks head-on, no tunneling to ~13× gait speed, no-obstacle
      physics byte-exact. Collision metric is now **real contacts**, not geometry.
  - **N-A controller** is kept as the documented CMA-ES baseline RL must beat (not shipped, not
    tossed). Bundle on sentry `outputs/web_data_n/` (gitignored; pull via `cg artifact`).
  - **N-B scaffold** (`feat/n-navigation-scaffold`, portfolio): the `/behaviors/navigation` page +
    FeelerField viz, committed, **parked** — no live demo until a generalizing RL result exists.

## First moves tomorrow (the next chunk is wave-2 integrate)

1. **Verify the one open code item:** confirm `rl/ppo.py`'s done-mask reset is **rank-generic** for
   the `(B,4,8,8)` CA state (it was only exercised against the Pendulum stub's `(B,1)` state). A
   shape assertion with a `(B,4,8,8)` dummy is enough. Fix if needed before any real PPO run.
2. **Run wave-2 integrate** — `cellular-gaits/PROMPT_n_rl_2_integrate.md`: wire env+policy+ppo,
   `scripts/run_rl_navigation.py`, and run the **4-gate calibration on the now-physical task**, then
   STOP and write `REPORT_n_rl_calibration.md`. Apply two findings from tonight:
   - **Raise `w_collide` to ~0.5–1.0** — real contacts are 11–28/episode (vs N-A's geometric 100+),
     so the old 0.2 no longer bites.
   - **Consider dropping the Newton/CG solver cap** — the "pinned fly explodes the solver" premise
     did **not** reproduce with real contacts (ncon stayed ≤23; uncapped was actually faster). It's
     retained for now; wave-2 can remove it.
   - Gate 2 needs the N-A controller as the baseline — **pull `web_data_n`** (`cg artifact`) or run
     the calibration on sentry where it already lives.
3. **Where it runs:** wire on the Mac (CC has `claude`), but **run the `--calibrate` job on sentry**
   (flygym + `web_data_ch` + `web_data_n` + the cores live there; rollouts are CPU-bound and now
   candidate-dependent with real contacts). Dispatch via direct ssh+tmux (no `claude` on the box
   yet) or the Fleet dashboard nav/run verbs. Mind the throughput ceiling: reset ≈250 ms, physical
   episode ≈2.5–4 s.
4. **STOP at the calibration**, send the report to a Cowork session for the go/no-go on the full run.

## After navigation
The endgame the harness was built for: the real FlyWire **LC4/LPLC2→DNp01** connectome sub-circuit
driving the body (RL on the 3080 Ti) — plug a `ConnectomePolicy` into the same `rl/` env + PPO loop.
(Separately, the **Fleet Mission Control** project has its own folder/onboarding — don't conflate it
with this; cellular-gaits is the focus here.)

## Open / carried items
- `cg run` (delegated Claude CLI) still fails on sentry — `claude` not installed there. `cg nav` /
  direct `uv run` works; dispatch scripts via ssh+tmux (tee to `~/cockpit-logs/<name>.log` so
  `cg peek` sees them). Installing the CLI on the box is the unblock for delegated box sessions.
- Reset-cost throughput ceiling: if the full run is too slow, reset the obstacle's pose instead of
  rebuilding `FlyEnv`+warmup each episode.

## Disposition
Opinionated partner, radical honesty (name stubs vs real), keep the living docs current (update
`SYNC.md` last + commit), validate before shipping.
