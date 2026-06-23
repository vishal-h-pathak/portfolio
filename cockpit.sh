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
#   ./cockpit.sh run-v <repo> "<directive>" # STREAMING (verbose stream-json) + Remote Control on -> readable via peekv
#   ./cockpit.sh runi <repo> "<directive>"  # INTERACTIVE (no -p) + RC: seed+submit, pause at STOP gate; steer via attach//rc
#   ./cockpit.sh status                     # list tmux sessions + last line of each log
#   ./cockpit.sh logs [name]                # LIVE tail a job log over SSH (default: nav)
#   ./cockpit.sh fetch                      # copy ALL box job logs -> Mac (outputs/remote-logs/) for Claude to read
#   ./cockpit.sh peek [name]                # fetch, then print the tail locally (default: nav)
#   ./cockpit.sh peekv <name>               # render a STREAMING (run-v) session log readably (live play-by-play)
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

  run-v)
    # Like `run`, but with --verbose --output-format stream-json so the session emits a live JSONL
    # event stream (assistant text, tool calls, results) instead of only a final dump. The log holds
    # raw JSONL; render it readably on the Mac with `./cockpit.sh peekv <name>`. Directive crosses
    # ssh/tmux base64-encoded (zero quoting/injection surface), decoded into a temp file on the box.
    # --rc keeps Remote Control ON (like run-b64) so the /rc URL still surfaces into the log ->
    # reporter -> dashboard (Phase B). Observe-only means no STOP gate / no steering here, NOT
    # dropping /rc telemetry — peekv just renders the stream; runi (next) adds the gate.
    repo="${1:-}"; directive="${2:-}"
    [ -n "$repo" ] && [ -n "$directive" ] || { echo 'usage: ./cockpit.sh run-v <cellular-gaits|portfolio> "<directive>"'; exit 1; }
    target="$WIN_BASE/$repo"
    sess="claude-$(date +%H%M%S)"
    b64="$(printf %s "$directive" | base64 | tr -d '\n')"
    echo "Dispatching a STREAMING Claude session on the box (tmux '$sess') in $repo ..."
    rsh "
      set -e
      mkdir -p $RLOG
      cd $target && git pull --ff-only || true
      f=\$(mktemp)
      printf %s '$b64' | base64 -d > \"\$f\"
      tmux new-session -d -s $sess \"cd $target && claude --rc --permission-mode bypassPermissions --verbose --output-format stream-json -p \\\"\\\$(cat \$f)\\\" 2>&1 | tee $RLOG/$sess.log; rm -f \$f\"
    "
    echo "Launched '$sess' (streaming JSONL).  Live play-by-play:  ./cockpit.sh peekv $sess"
    ;;

  runi)
    # INTERACTIVE delegated session (NOT -p): launch a LIVE `claude` TUI in tmux on the box with
    # --rc (Remote Control on) + bypassPermissions, seed the directive via base64 + tmux send-keys,
    # then SUBMIT it. The session runs autonomously until ITS prompt's STOP gate — the in-session
    # go/no-go — where you steer IN-CONTEXT via `cg attach <name>` or the /rc URL (no fresh dispatch,
    # no re-read). Reserve `run`/`-p` for autonomous, no-confirmation jobs; use `runi` for the
    # STOP-and-confirm jobs that headless `-p` can't continue. `run`/`run-b64`/`run-v` are untouched.
    #
    # Interactive != headless: a TUI needs a real TTY, so we must NOT pipe to `tee` (that kills the
    # UI and steerability). We attach `claude` to the tmux pane's pty and capture the pane to the
    # SAME $RLOG/<name>.log path via `tmux pipe-pane`. The slow part (wait for the TUI to settle,
    # seed+submit the directive, then watch for the /rc URL) runs in a detached box-side DRIVER
    # script — shipped base64-encoded so its quoting/regex survive ssh intact, and run under nohup so
    # it outlives this ssh call. The dispatcher only does the fast setup; the driver does the rest.
    repo="${1:-}"; directive="${2:-}"
    [ -n "$repo" ] && [ -n "$directive" ] || { echo 'usage: ./cockpit.sh runi <cellular-gaits|portfolio> "<directive>"'; exit 1; }
    case "$repo" in cellular-gaits|portfolio) ;; *) echo "runi: repo must be 'cellular-gaits' or 'portfolio'"; exit 1;; esac
    [ "${#directive}" -le 8000 ] || { echo "runi: directive too long (${#directive} chars > 8000)"; exit 1; }
    # Seed-and-submit needs a single printable line so exactly one Enter submits: a stray newline
    # would submit early; control chars/NULs could corrupt the TUI. Reject anything non-[:print:].
    ctl="$(printf %s "$directive" | LC_ALL=C tr -d '[:print:]' | wc -c | tr -d ' ')"
    [ "$ctl" = "0" ] || { echo "runi: directive must be a single printable line (no newlines/control chars)"; exit 1; }
    target="$WIN_BASE/$repo"
    sess="claude-runi-$(date +%H%M%S)"   # 'claude-' => reporter inferKind=claude-session; 'runi' => attach-by-name
    b64="$(printf %s "$directive" | base64 | tr -d '\n')"
    # Box-side driver (quoted heredoc => NOTHING expands here; $HOME/$sess/$1 all evaluate ON THE BOX).
    # args: $1=sess $2=directive-file. Steps: (1) wait for the TUI to be STABLE (two identical frames,
    # not just footer-present) so keystrokes aren't dropped mid-render; (2) seed once, then CONFIRM the
    # full directive landed (its last 24 chars visible at the cursor) before pressing Enter — a
    # dropped/partial seed is reported, never blindly submitted; (3) watch for the /rc URL (ANSI-strip
    # the log + wrap-join the pane) and write the deterministic .rc sidecar the reporter reads
    # ($LOG_DIR/<name>.rc) directly — version-agnostic, no reporter/node/token dependency.
    driver_b64="$(base64 <<'RUNID' | tr -d '\n'
#!/usr/bin/env bash
sess="$1"; dir="$2"
L="$HOME/cockpit-logs"; log="$L/$sess.log"
# 1) Readiness: input UI mounted AND stable (two identical frames). Poll-based, not a fixed sleep.
prev=""; stable=0
for i in $(seq 1 80); do
  pane="$(tmux capture-pane -pJ -t "$sess" 2>/dev/null || true)"
  if printf '%s' "$pane" | grep -qiE 'for shortcuts|bypass permission|esc to interrupt'; then
    if [ "$pane" = "$prev" ]; then stable=$((stable + 1)); else stable=0; fi
    [ "$stable" -ge 2 ] && break
  fi
  prev="$pane"
  tmux has-session -t "$sess" 2>/dev/null || break
  sleep 0.5
done
# 2) Seed once (literal), then confirm the full directive landed before submitting.
mark="$(tail -c 24 "$dir" 2>/dev/null)"
tmux send-keys -t "$sess" -l "$(cat "$dir" 2>/dev/null)"
seeded=0
for j in $(seq 1 20); do
  sleep 0.5
  pane="$(tmux capture-pane -pJ -t "$sess" 2>/dev/null || true)"
  if printf '%s' "$pane" | grep -qF "$mark"; then seeded=1; break; fi
done
rm -f "$dir"
if [ "$seeded" = 1 ]; then
  tmux send-keys -t "$sess" Enter
  printf '%s\n' '[runi] directive seeded + submitted' >> "$log"
else
  printf '%s\n' '[runi] WARNING: seed not confirmed in the input box — NOT auto-submitted; attach and submit manually.' >> "$log"
fi
# 3) /rc-URL watcher -> write the deterministic .rc sidecar DIRECTLY ($LOG_DIR/<name>.rc, first line
#    = URL). This is the exact file the reporter reads, written ourselves rather than via the
#    reporter's --set-rc one-shot: that one-shot isn't in every deployed reporter version (an older
#    reporter treats `--set-rc ...` as ordinary argv and launches a DUPLICATE daemon), whereas the
#    .rc file contract is identical and version-agnostic. No node/token/env dependency.
re='https://(app\.claude\.com/rc|claude\.ai/code|claude\.com/code)/[A-Za-z0-9][A-Za-z0-9._~%/-]*'
got=""
for i in $(seq 1 150); do
  txt="$( { sed -E 's/\x1b\[[0-9;?]*[ -/]*[@-~]//g' "$log" 2>/dev/null; tmux capture-pane -pJ -S -4000 -t "$sess" 2>/dev/null; } )"
  url="$(printf '%s' "$txt" | grep -oE "$re" | tail -n1)"
  if [ -n "$url" ]; then
    printf '%s\n' "$url" > "$L/$sess.rc"
    printf '[runi] /rc captured -> %s.rc: %s\n' "$sess" "$url" >> "$log"
    got=1; break
  fi
  tmux has-session -t "$sess" 2>/dev/null || break
  sleep 1
done
[ -n "$got" ] || printf '%s\n' '[runi] no /rc URL detected in watch window (interactive --rc may not have emitted one)' >> "$log"
RUNID
)"
    echo "Dispatching an INTERACTIVE Claude session (RC on, STOP-gated) on the box (tmux '$sess') in $repo ..."
    rsh "
      set -e
      mkdir -p $RLOG
      cd $target && git pull --ff-only || true
      L=\$HOME/cockpit-logs
      f=\$(mktemp)
      printf %s '$b64' | base64 -d > \"\$f\"
      tmux kill-session -t $sess 2>/dev/null || true
      # NO -p: interactive TUI bound to the tmux pane's pty -> stays live + steerable.
      tmux new-session -d -s $sess \"cd $target && claude --rc --permission-mode bypassPermissions\"
      # Interactive => capture the PANE (not a stdout pipe) to the same log path run/run-v use.
      tmux pipe-pane -t $sess -o \"cat >> \$L/$sess.log\"
      # Hand off to the detached driver (readiness + seed/submit + /rc watch). nohup outlives ssh.
      df=\$(mktemp)
      printf %s '$driver_b64' | base64 -d > \"\$df\"
      nohup bash \"\$df\" $sess \"\$f\" >/dev/null 2>&1 &
    "
    echo "Launched '$sess' (interactive, RC on). Steer:  ./cockpit.sh attach $sess   |   /rc surfaces on its job card."
    echo "It seeds + submits the directive, then pauses at its STOP gate; continue IN-CONTEXT by typing into the attached session."
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

  peekv)
    # Render a STREAMING (run-v) session log readably: fetch the JSONL, pipe through render-stream.py.
    name="${1:-}"
    [ -n "$name" ] || { echo 'usage: ./cockpit.sh peekv <name>'; exit 1; }
    mkdir -p "$MAC_LOGS"
    scp -q "$WIN_HOST:cockpit-logs/$name.log" "$MAC_LOGS/$name.log" 2>/dev/null || true
    if [ ! -s "$MAC_LOGS/$name.log" ]; then echo "(no $name.log yet — the session may still be spinning up)"; exit 0; fi
    echo "===== $name (rendered; raw JSONL at outputs/remote-logs/$name.log) ====="
    python3 "$(dirname "$0")/ops/render-stream.py" "$MAC_LOGS/$name.log" | tail -n 60
    ;;

  attach)
    name="${1:-nav}"
    # Convenience: `cg attach runi` resolves to the most-recently-active live `*runi*` session
    # (runi names are claude-runi-<HHMMSS>, so an exact target isn't memorable). Default `nav` and
    # any explicit session name are unchanged.
    if [ "$name" = "runi" ]; then
      name="$(rsh "tmux ls -F '#{session_activity} #{session_name}' 2>/dev/null | grep runi | sort -n | tail -n1 | awk '{print \$2}'")"
      [ -n "$name" ] || { echo "no live 'runi' session found on the box (try: ./cockpit.sh status)"; exit 1; }
      echo "attaching to latest runi session: $name"
    fi
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
