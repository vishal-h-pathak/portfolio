# Cross-machine workflow — the playbook (read once, then live by SYNC.md)

> **Purpose.** How we run this project across **two machines** without tangling: a portable
> Mac and a heavy-compute Windows workstation, either of which can do *either* role. This file
> is the **static how-it-works + one-time setup**. The **live state** (who's doing what right
> now) lives in `SYNC.md` — read that at the start of every session and update it at the end.
>
> This is written project-rooted but is a **copyable template** — the protocol generalizes to
> any two-machine setup. Maintainer: Vishal.

## The machines

| | **Mac (MacBook Air)** | **Windows (5900X / 3080 Ti / 32 GB)** |
|---|---|---|
| Strength | portable, low-friction, always-on cockpit | 12 real cores, 32 GB no-swap, CUDA GPU |
| Natural role | plan, query, write prompts, wire web, ship to Vercel | heavy CMA-ES / RL, long runs, GPU work later |
| But | weak for heavy `mj_step` (≈8 cores, swap-bound at 16 GB) | less portable; lives at the desk |

**Both machines, both roles.** Either can do interactive dev *or* compute — the flexibility is
the point. The cost is discipline: the rules below (and `SYNC.md`) are what keep two machines
from clobbering each other.

## The spine: git (already 90% in place)

Both repos are on GitHub (`vishal-h-pathak/portfolio`, `…/cellular-gaits`) and the heavy
artifacts (`checkpoints/`, `outputs/`, `.venv/`) are gitignored. So **only small, distilled
things cross via git**; big things stay local. That's the whole trick.

**What crosses git (commit it):** code, docs, `PROMPT_*.md`, the **web-export bundle** (the
controller JSON + a couple of clips + metrics that land in `portfolio/public/cellular-gaits/data-*/`).

**What stays local (gitignored, never committed):** `checkpoints/`, `outputs/`, `.venv/`, raw
multi-gen evolution state, QA screenshots. If the *other* machine genuinely needs a big
artifact, move it over the **side channel** (Tailscale `scp`/`rsync`, or a W&B artifact) — not git.

### The golden rules (these prevent every tangle)

1. **Pull at session start, push at session stop.** `git pull` before you touch anything;
   commit + push before you walk away. Never leave uncommitted work when switching machines —
   this is `AGENT_SAFETY.md` rule #7 extended across machines.
2. **One branch is advanced from one machine at a time.** Claim it in `SYNC.md` (the "active
   claims" table) before you start. Two machines on the same branch = the phantom-branch tangle,
   now with extra steps. Different branches in parallel is fine.
3. **`SYNC.md` is the heartbeat.** Read it first, update it last, commit it with your work. It's
   how a fresh session on *either* machine — or me in Cowork — knows what's running where.
4. **Each machine owns its environment.** `.venv` is not synced; run `uv sync` on each machine.
   Per-machine run params differ (see below) — that's expected, not drift.

### Reproducible envs (one small change to make)

`uv.lock` is currently gitignored. For two machines to resolve **identical** dependencies,
**commit `uv.lock`** (remove it from `cellular-gaits/.gitignore`). Platform-specific wheels
(arm64 Mac vs x64 Windows) are handled by uv from the same lock; the lock pins versions so the
two machines don't silently diverge. (The browser demos are unaffected — MuJoCo-WASM is
client-side and the fly MJCF+STLs are committed under `portfolio/public/`.)

### Per-machine run parameters

The evolution CLI is the same; tune workers/scale to the machine and note the actual command in
`SYNC.md` when you launch:

- **Windows (5900X):** more workers, no swap — e.g. `--workers 16` (leave a couple of threads
  for the OS). This is the machine for `--pop 48 --gens 70`-class runs.
- **Mac (Air):** `--workers 6` or so; fine for calibration/smoke, painful for full runs.

## Layer 1 — git + `SYNC.md` (the minimum; already set up by this commit)

Nothing to install. The protocol above + `SYNC.md` + the `CLAUDE.md` rule blocks in both repos
are Layer 1. Every session, on either machine, in Cowork or CLI, follows it.

## Layer 2 — Tailscale + SSH (drive Windows from the Mac without switching)

Goal: from the Mac cockpit, kick off / tail / pull a Windows run without walking to the desk.
Once this is up, you orchestrate from the Mac with **`cockpit.sh`** (portfolio root):
`./cockpit.sh check | sync | nav | run <repo> "<directive>" | status | logs | attach | pull`.
The full bare-metal Windows bootstrap (incl. CUDA later) is **`cellular-gaits/WINDOWS_SETUP.md`**.

**One-time setup:**

1. **Tailscale on both machines.** Install from tailscale.com, sign in with the same account on
   the Mac and the Windows box. They get stable `100.x` IPs on a private WireGuard mesh — no
   port-forwarding, works from anywhere. (`tailscale ip -4` shows the address; `tailscale status`
   lists peers.)
2. **Enable OpenSSH Server on Windows.** Settings → System → Optional features → Add → "OpenSSH
   Server", then in an admin PowerShell: `Start-Service sshd; Set-Service -Name sshd -StartupType Automatic`.
3. **Key auth Mac → Windows.** `ssh-copy-id` isn't native on Windows; append your Mac's
   `~/.ssh/id_ed25519.pub` to `C:\Users\<you>\.ssh\authorized_keys` on the Windows box (create
   the file if needed). Test from the Mac: `ssh <you>@<windows-tailscale-ip>`.
4. **(Optional) VS Code Remote-SSH** to the Windows box gives you a full editor on the
   workstation from the laptop.

**Daily use:** from the Mac, `ssh <you>@<win-ip>`, `cd` into `cellular-gaits`, `git pull`, launch
`claude` (CLI) or run the evolution directly, detach. For long runs, start them under a
persistent session so they survive disconnect — on Windows native, run inside a `tmux`/`screen`
under Git-Bash, or just launch and poll; under WSL2, `tmux` works as on Linux.

## Layer 3 — Weights & Biases (one dashboard for runs from both machines)

Goal: fitness curves from any machine land in one place; compare runs; keep run metadata off git.

**One-time setup:** make a free account at wandb.ai, `uv add wandb` (or `pip install wandb
--break-system-packages`), `wandb login` on each machine (paste the API key once).

**Integration:** additive logging in the evolve loop — `wandb.init(project="cellular-gaits",
name=run_id, config=cfg)` at start, `wandb.log({"gen": g, "best_fit": ..., "mean_fit": ...})`
each generation, log the final clips/controller as a `wandb.Artifact`. Both machines write to the
same project, tagged by host, so a run started on Windows and one on the Mac sit side by side.
A ready-to-run delegated prompt for this lives at `cellular-gaits/PROMPT_wandb_integration.md`.

**Why it helps the split specifically:** the run *artifacts* (controllers, clips) can ride W&B
instead of git when they're too big or you want them browsable — the heavy machine logs them,
the cockpit pulls only what it needs to wire into the site.

## The loop, end to end (typical handoff)

1. **Mac (cockpit):** design the experiment with Claude (Cowork), write `PROMPT_*.md`, commit +
   push, and add a `SYNC.md` entry: *"queued PROMPT_x for Windows."*
2. **Windows (compute):** `git pull`, claim the branch in `SYNC.md`, run the heavy job (CLI
   session or direct), commit the **small export bundle** + report, push, update `SYNC.md`:
   *"run done, export pushed."* Big checkpoints stay local / go to W&B.
3. **Mac:** `git pull`, copy the export into `public/cellular-gaits/data-*/`, wire the live demo,
   ship to Vercel. Update `SYNC.md`.

The discipline is small; the payoff is that you never wonder "which machine has the real version"
— git + `SYNC.md` always answer it.
