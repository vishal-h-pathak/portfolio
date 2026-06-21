#!/usr/bin/env bash
#
# cockpit.sh — run on the MAC (cockpit). Drives the Windows workstation over Tailscale/SSH:
# dispatch a delegated Claude prompt, start/monitor the paused nav run, pull results back.
#
# Prereqs (one-time, see cellular-gaits/WINDOWS_SETUP.md Tier 1):
#   - Windows box on Tailscale with an SSH server (WSL2 + tmux recommended).
#   - Key auth from this Mac.  export WIN_HOST="user@box-tailscale-name"   (MagicDNS or 100.x IP)
#   - Optional: export WIN_BASE="~/dev/jarvis"   (where both repos are cloned on the box; default below)
#
# Usage:
#   ./cockpit.sh check                      # is the box reachable?
#   ./cockpit.sh sync                       # git pull both repos on the box
#   ./cockpit.sh nav                        # START the paused nav run (chemo bridge + tmux, detached)
#   ./cockpit.sh run <repo> "<directive>"   # launch a delegated Claude CLI session on the box (tmux)
#   ./cockpit.sh status                     # list tmux sessions on the box
#   ./cockpit.sh logs [name]                # tail a run log (default: nav)
#   ./cockpit.sh attach [name]              # interactively attach to a tmux session (default: nav)
#   ./cockpit.sh pull                       # git pull both repos here on the Mac (after the box pushes)

set -euo pipefail

WIN_HOST="${WIN_HOST:-}"
WIN_BASE="${WIN_BASE:-~/dev/jarvis}"
CELL="$WIN_BASE/cellular-gaits"
PORT="$WIN_BASE/portfolio"
MAC_BASE="$HOME/dev/jarvis"

[ -n "$WIN_HOST" ] || { echo "Set WIN_HOST first:  export WIN_HOST=\"user@box-tailscale-name\""; exit 1; }
rsh () { ssh "$WIN_HOST" "$@"; }

NAV_CMD='uv run python scripts/run_evolution_navigation.py --pop 48 --gens 70 --checkpoint-every 5 --workers 16'

cmd="${1:-}"; shift || true
case "$cmd" in
  check)
    echo "Pinging $WIN_HOST ..."
    rsh 'echo "reachable: $(hostname); $(uname -a 2>/dev/null || ver)"'
    ;;

  sync)
    echo "Pulling both repos on the box ..."
    rsh "cd $CELL && git pull --ff-only; cd $PORT && git pull --ff-only"
    ;;

  nav)
    echo "Starting the paused navigation run on $WIN_HOST (detached tmux 'nav') ..."
    rsh "
      set -e
      cd $CELL && git checkout feat/n-navigation && git pull --ff-only || true
      cd $PORT && git checkout feat/n-navigation-scaffold && git pull --ff-only || true
      mkdir -p $CELL/outputs/web_data_ch
      cp -n $PORT/public/cellular-gaits/data-ch/chemotaxis_controller.json $CELL/outputs/web_data_ch/ || true
      cd $CELL && uv sync
      tmux kill-session -t nav 2>/dev/null || true
      tmux new-session -d -s nav \"cd $CELL && $NAV_CMD 2>&1 | tee outputs/nav_run.log\"
    "
    echo "Launched. Monitor with:  ./cockpit.sh logs nav   (or)  ./cockpit.sh attach nav"
    ;;

  run)
    repo="${1:-}"; directive="${2:-}"
    [ -n "$repo" ] && [ -n "$directive" ] || { echo 'usage: ./cockpit.sh run <cellular-gaits|portfolio> "<directive>"'; exit 1; }
    target="$WIN_BASE/$repo"
    sess="claude-$(date +%H%M%S)"
    echo "Dispatching a Claude CLI session on the box (tmux '$sess') in $repo ..."
    # -p runs headless; bypassPermissions for the delegated agent. Review output via logs/attach.
    rsh "cd $target && git pull --ff-only || true; tmux new-session -d -s $sess \"cd $target && claude --permission-mode bypassPermissions -p '$directive' 2>&1 | tee /tmp/$sess.log\""
    echo "Launched '$sess'. Watch:  ./cockpit.sh attach $sess   (log: /tmp/$sess.log on the box)"
    ;;

  status)
    rsh 'tmux ls 2>/dev/null || echo "no tmux sessions"'
    ;;

  logs)
    name="${1:-nav}"
    if [ "$name" = "nav" ]; then rsh "tail -n 40 -f $CELL/outputs/nav_run.log"; else rsh "tail -n 40 -f /tmp/$name.log"; fi
    ;;

  attach)
    name="${1:-nav}"
    exec ssh -t "$WIN_HOST" "tmux attach -t $name"
    ;;

  pull)
    echo "Pulling both repos here on the Mac ..."
    cd "$MAC_BASE/cellular-gaits" && git pull --ff-only
    cd "$MAC_BASE/portfolio" && git pull --ff-only
    ;;

  *)
    sed -n '2,25p' "$0"; exit 1 ;;
esac
