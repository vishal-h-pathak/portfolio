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
| cellular-gaits | `feat/cg-renders-w2` | _unclaimed (render DONE — not merged)_ | **Two-angle render of all 4 behaviours DONE** | `scripts/render_all.py` committed. Full render → `outputs/r2_all/` (gitignored): 20 mp4 + 7 json, primary legible cam + shared `topdown` for gait/chemo/pert/escape. All legible, headline behaviours intact. `ops/reports/REPORT_cg_render_all.md`. Not merged to main. NEXT: pick which angle ships + web-wire (later wave). |
| cellular-gaits | `feat/n-navigation` | _unclaimed_ | calibrated, full run PENDING | run on WIN: `uv run python scripts/run_evolution_navigation.py --pop 48 --gens 70 --checkpoint-every 5 --workers 16` |
| portfolio | `feat/n-navigation-scaffold` | _unclaimed_ | committed (230c040), not shipped | hold until N-C lands, then ship nav as a complete tab |
| portfolio | `main` | — | production | escape is live (shipped from `feat/x-escape-live`) |
| portfolio | `feat/cg-redesign-wpE` | _unclaimed (WP-E DONE — not merged)_ | **The Embodied Fly climax page built** | Off `feat/cg-redesign`. Rebuilt `embodied/page.tsx` + 4 new anatomy visuals (`EmbodiedLoop`, `BrainCircuitMap`, `GfResponse`, `EmbodiedConditions`) against the `data-eb` bundle. tsc clean; data-logic validated vs the bundle (Turbopack build blocked by the worktree symlink — render after integration). `ops/reports/REPORT_cg_wpE_embodied.md`. NEXT: integrate → `feat/cg-redesign`. (NB: this branch's SYNC board predates the embodied refocus — the live board is on `feat/dual-machine-watcher`.) |

## Current project state (one glance)

- **Escape — DONE, live in production.** `/behaviors/escape` shipped. Controller + demo + clips
  + trajectory map all on the main site.
- **Navigation — IN PROGRESS.**
  - N-A (compute): built, all 4 calibration gates pass, committed on `feat/n-navigation`. **Full
    evolution NOT yet run** — it's the next compute job, to run on **WIN** (the Mac run was
    canceled; ~4 h on the Air vs ~1.5 h on the workstation, and the GPU is the longer-term lever).
  - N-B (scaffold): committed on `feat/n-navigation-scaffold` (230c040), not shipped.
  - N-C (live demo): **not written yet** — Cowork writes it after N-A's full-run data lands.
- **Known constraint:** the chemo forager is a narrow, left-biased homer (clean only ~40°), so
  nav trains on az=40° × (near/far) × (left/right block). The live demo must be honest about that
  operating envelope. A future "better omnidirectional forager" pass would widen it for both
  chemotaxis and navigation.
- **Compute cliff reached:** `mj_step` is CPU-bound and heavy. CPU win = run on WIN now. GPU
  (3080 Ti) only helps via an MJX/Brax port (big rewrite, contact-rich sim is MJX's hard case,
  needs WSL2 for JAX) or the RL connectome endgame (PyTorch/CUDA, native Windows fine).

## Handoff queue (next actions, in order)

1. **WIN:** claim `feat/n-navigation`, `git pull`, run the nav full evolution (command above),
   commit the small export bundle + `REPORT_n_a.md`, push, update this board. Big checkpoints stay
   local / go to W&B.
2. **MAC (Cowork):** pull, copy `web_data_n*/` → `portfolio/public/cellular-gaits/data-n/`, write
   **N-C** (envelope-aware live demo + detour clips + trajectory map) + the wave-2 script.
3. **MAC:** ship navigation (scaffold + N-C together) to production.
4. Then: obstacle-nav polish done → the **real FlyWire LC4/LPLC2→DNp01 connectome sub-circuit**
   (the endgame; RL on the 3080 Ti).

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
`pull` syncs results back to the Mac. Mac push: `portfolio/push-cross-machine.sh`.

## Sync log (append-only, newest at top)

- **2026-07-01 (MAC / Cowork)** — `cellular-gaits feat/cg-renders-w2` two-angle render wave **DONE**.
  Preflight passed (all local artifacts present). `--quick` smoke (12 clips, 92.5s, no cam errors) →
  reviewed → full render (`scripts/render_all.py --out outputs/r2_all/`, 162.2s, exit 0). Output:
  20 mp4 + 7 json — gait/chemo/pert/escape each in primary legible cam + `topdown`. Escape ran the
  live GF sweep on the v783 brain (138,639 neurons; GF peaks L 133.3 / R 100.0 Hz). Eyeballed: all
  legible across static arenas both angles; gait forward-distance and perturbation open-vs-closed
  drift intact in the new angle. `scripts/render_all.py` + `ops/reports/REPORT_cg_render_all.md`
  committed on the branch. **Not merged to main.** Clips gitignored (stay local). Next: angle
  selection + web-wiring in a later wave.
- **2026-06-21 (MAC / Cowork)** — Cross-machine system created (Layers 1–3 specced, Layer 1
  live). Added `WINDOWS_SETUP.md` (bare-metal bootstrap, tiered) + `cockpit.sh` (Mac→WIN remote
  control). Escape confirmed shipped to production. Nav full run reassigned MAC → WIN (compute
  cliff). This board initialized. Next: WIN runs the nav evolution (`cockpit.sh nav` once SSH up,
  or directly per WINDOWS_SETUP Tier 0).
