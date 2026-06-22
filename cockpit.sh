#!/usr/bin/env bash
#
# cockpit.sh — run on the MAC (cockpit). Drives the Windows workstation over Tailscale/SSH:
# dispatch work, monitor it, and pull output back to where you AND Claude (Cowork) can see it.
#
# Prereqs (one-time, see cellular-gaits/WINDOWS_SETUP.md Tier 1):
#   - Windows box on Tailscale with an SSH server (WSL2 + tmux).
#   - Key auth from this Mac.  export WIN_HOST="user@box-tailscale-name"   (MagicDNS or 100.x IP)
#   - Optional: export WIN_BASE="~/dev/jarvis"   (where both repos are cloned on the box)
#   - On the box (once):  sudo apt install -y rsync   (for the artifact channel)
#
# Usage:
#   ./cockpit.sh check                      # is the box reachable?
#   ./cockpit.sh sync                       # git pull both repos on the box
#   ./cockpit.sh nav                        # START the paused nav run (chemo bridge + tmux, detached)
#   ./cockpit.sh run <repo> "<directive>"   # launch a delegated Claude CLI session on the box (tmux)
#   ./cockpit.sh run-b64 <repo> <b64>       # same, but directive is base64 (safe over ssh/tmux) + Remote Control on
#   ./cockpit.sh status                     # list tmux sessions + last line of each log
#   ./cockpit.sh logs [name]                # LIVE tail a job log over SSH (default: nav)
#   ./cockpit.sh fetch                      # copy ALL box job logs -> Mac (outputs/remote-logs/) for Claude to read
#   ./cockpit.sh peek [name]                # fetch, then print the tail locally (default: nav)
#   ./cockpit.sh attach [name]              # interactively attach to a tmux session (default: nav)
#   ./cockpit.sh artifact <relpath> [dest]  # rsync a big file/dir from the box (relpath under WIN_BASE)
#   ./cockpit.sh wait [name]                # block until a job ends, then fetch log + notify (default: nav)
#   ./cockpit.sh morning                    # one-shot resync: fetch logs + git pull both Mac repos + status
#   ./cockpit.sh pull                       # git pull both repos here on the Mac (after the box pushes)
#
# Observability loop: every job tees to ~/cockpit-logs/<name>.log on the box. `fetch`/`peek`
# mirror that dir into the Mac repo at outputs/remote-logs/ (gitignored), which Claude can Read —
# so a run on the box becomes visible on the cockpit without you transcribing anything.

set -euo pipefail

WIN_HOST="${WIN_HOST:-}"
WIN_BASE="${WIN_BASE:-~/dev/jarvis}"
CELL="$WIN_BASE/cellular-gaits"
PORT="$WIN_BASE/portfolio"
MAC_BASE="$HOME/dev/jarvis"
RLOG='~/cockpit-logs'                                   # box-side log dir (~ expands on the box)
MAC_LOGS="$MAC_BASE/cellular-gaits/outputs/remote-logs" # Mac landing zone (gitignored, Claude-readable)

[ -n "$WIN_HOST" ] || { echo "Set WIN_HOST first:  export WIN_HOST=\"user@box-tailscale-name\""; exit 1; }
rsh () { ssh "$WIN_HOST" "$@"; }

# PYTHONUNBUFFERED=1 so per-generation output streams live through the tee pipe (otherwise
# Python block-buffers stdout when piped and the log looks frozen for minutes at a time).
NAV_CMD='PYTHONUNBUFFERED=1 uv run python scripts/run_evolution_navigation.py --pop 48 --gens 70 --checkpoint-every 5 --workers 16'

cmd="${1:-}"; shift || true
case "$cmd" in
  check)
    echo "Pinging $WIN_HOST ..."
    rsh 'echo "reachable: $(hostname); $(uname -sr)"'
    ;;

  sync)
    echo "Pulling both repos on the box ..."
    rsh "cd $CELL && git pull --ff-only; cd $PORT && git pull --ff-only"
    ;;

  nav)
    echo "Starting the paused navigation run on $WIN_HOST (detached tmux 'nav') ..."
    rsh "
      set -e
      mkdir -p $RLOG
      cd $CELL && git checkout feat/n-navigation && git pull --ff-only || true
      cd $PORT && git checkout feat/n-navigation-scaffold && git pull --ff-only || true
      mkdir -p $CELL/outputs/web_data_ch
      cp -n $PORT/public/cellular-gaits/data-ch/chemotaxis_controller.json $CELL/outputs/web_data_ch/ || true
      cd $CELL && uv sync
      tmux kill-session -t nav 2>/dev/null || true
      tmux new-session -d -s nav \"cd $CELL && $NAV_CMD 2>&1 | tee $RLOG/nav.log\"
    "
    echo "Launched. Monitor:  ./cockpit.sh logs nav   |   bring to Mac for Claude:  ./cockpit.sh peek nav"
    ;;

  run)
    repo="${1:-}"; directive="${2:-}"
    [ -n "$repo" ] && [ -n "$directive" ] || { echo 'usage: ./cockpit.sh run <cellular-gaits|portfolio> "<directive>"'; exit 1; }
    target="$WIN_BASE/$repo"
    sess="claude-$(date +%H%M%S)"
    echo "Dispatching a Claude CLI session on the box (tmux '$sess') in $repo ..."
    # -p runs headless; bypassPermissions for the delegated agent. Review via logs/peek/attach.
    rsh "mkdir -p $RLOG; cd $target && git pull --ff-only || true; tmux new-session -d -s $sess \"cd $target && claude --permission-mode bypassPermissions -p '$directive' 2>&1 | tee $RLOG/$sess.log\""
    echo "Launched '$sess'.  Watch:  ./cockpit.sh attach $sess   |   to Mac:  ./cockpit.sh peek $sess"
    ;;

  run-b64)
    # Delegated session whose directive arrives BASE64-encoded (the fleet control plane sends it
    # this way so the natural-language goal crosses ssh/tmux with ZERO quoting/injection surface).
    # We decode on the box with `base64 -d` into a temp file (NEVER eval) and feed it to claude as
    # ONE literal argument via -p "$(cat <tmpfile>)" — no re-expansion of its contents. --rc turns
    # Remote Control on so the session self-surfaces its /rc URL into the log (Phase B) → reporter
    # → dashboard → tap to steer. The existing `run` above is left untouched for backward compat.
    repo="${1:-}"; b64="${2:-}"
    [ -n "$repo" ] && [ -n "$b64" ] || { echo 'usage: ./cockpit.sh run-b64 <cellular-gaits|portfolio> <base64-directive>'; exit 1; }
    target="$WIN_BASE/$repo"
    sess="claude-$(date +%H%M%S)"
    echo "Dispatching a delegated Claude session (Remote Control ON) on the box (tmux '$sess') in $repo ..."
    rsh "
      set -e
      mkdir -p $RLOG
      cd $target && git pull --ff-only || true
      f=\$(mktemp)
      printf %s '$b64' | base64 -d > \"\$f\"
      tmux new-session -d -s $sess \"cd $target && claude --rc --permission-mode bypassPermissions -p \\\"\\\$(cat \$f)\\\" 2>&1 | tee $RLOG/$sess.log; rm -f \$f\"
    "
    echo "Launched '$sess' (RC on). The /rc URL will surface in the log -> reporter -> dashboard.  Watch:  ./cockpit.sh attach $sess   |   to Mac:  ./cockpit.sh peek $sess"
    ;;

  status)
    rsh "tmux ls 2>/dev/null || echo 'no tmux sessions'; echo '--- latest log lines ---'; for f in $RLOG/*.log; do [ -e \"\$f\" ] && echo \"\$(basename \$f): \$(tail -n1 \"\$f\")\"; done 2>/dev/null"
    ;;

  logs)
    name="${1:-nav}"
    rsh "tail -n 40 -f $RLOG/$name.log"
    ;;

  fetch)
    mkdir -p "$MAC_LOGS"
    echo "Copying box logs -> $MAC_LOGS ..."
    scp -q -r "$WIN_HOST:cockpit-logs/." "$MAC_LOGS/" 2>/dev/null || { echo "(no logs yet on the box)"; exit 0; }
    echo "Done. Claude can now Read: outputs/remote-logs/*.log"
    ;;

  peek)
    name="${1:-nav}"
    mkdir -p "$MAC_LOGS"
    scp -q -r "$WIN_HOST:cockpit-logs/." "$MAC_LOGS/" 2>/dev/null || true
    echo "===== tail of $name.log (also saved to outputs/remote-logs/ for Claude) ====="
    tail -n 40 "$MAC_LOGS/$name.log" 2>/dev/null || echo "(no $name.log yet)"
    ;;

  attach)
    name="${1:-nav}"
    exec ssh -t "$WIN_HOST" "tmux attach -t $name"
    ;;

  artifact)
    rel="${1:-}"; dest="${2:-.}"
    [ -n "$rel" ] || { echo 'usage: ./cockpit.sh artifact <relpath-under-WIN_BASE> [local-dest]'; exit 1; }
    command -v rsync >/dev/null || { echo "install rsync on the Mac (brew install rsync) and the box (sudo apt install -y rsync)"; exit 1; }
    echo "rsync $WIN_HOST:$WIN_BASE/$rel -> $dest"
    rsync -azP -e ssh "$WIN_HOST:$WIN_BASE/$rel" "$dest"
    ;;

  wait)
    name="${1:-nav}"
    echo "Waiting for tmux '$name' on $WIN_HOST to finish (polling every 30s)..."
    while rsh "tmux has-session -t $name 2>/dev/null"; do sleep 30; done
    mkdir -p "$MAC_LOGS"; scp -q -r "$WIN_HOST:cockpit-logs/." "$MAC_LOGS/" 2>/dev/null || true
    printf '\a'  # terminal bell
    command -v osascript >/dev/null && osascript -e "display notification \"$name finished\" with title \"cockpit\" sound name \"Glass\"" || true
    echo "===== '$name' finished — last lines (also at outputs/remote-logs/$name.log for Claude) ====="
    tail -n 30 "$MAC_LOGS/$name.log" 2>/dev/null || true
    ;;

  morning)
    echo "Resyncing the cockpit after an overnight run ..."
    mkdir -p "$MAC_LOGS"; scp -q -r "$WIN_HOST:cockpit-logs/." "$MAC_LOGS/" 2>/dev/null || true
    ( cd "$MAC_BASE/cellular-gaits" && git pull --ff-only || true )
    ( cd "$MAC_BASE/portfolio" && git pull --ff-only || true )
    echo "--- jobs on the box ---"; rsh "tmux ls 2>/dev/null || echo 'no tmux sessions'"
    echo "Logs pulled to outputs/remote-logs/ — tell Claude to read them."
    ;;

  pull)
    echo "Pulling both repos here on the Mac ..."
    cd "$MAC_BASE/cellular-gaits" && git pull --ff-only
    cd "$MAC_BASE/portfolio" && git pull --ff-only
    ;;

  *)
    sed -n '11,30p' "$0"; exit 1 ;;
esac
