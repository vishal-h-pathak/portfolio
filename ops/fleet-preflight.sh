#!/usr/bin/env bash
#
# fleet-preflight.sh — verify the whole fleet-control path (Mac cockpit <-> sentry box) is connected
# and functional, end to end. Run on the MAC from the portfolio repo root.
#
#   ./ops/fleet-preflight.sh           # full: plumbing checks + dispatch the box self-test + verify
#   ./ops/fleet-preflight.sh quick     # plumbing/connectivity only (no delegated Claude dispatch)
#
# What it checks, in order:
#   LOCAL   WIN_HOST set; ssh/rsync/claude on PATH; cockpit.sh present; both repos cloned locally.
#   LINK    box reachable over SSH/Tailscale (hostname/uname).
#   BOX     uv, claude, tmux, rsync present; both repos cloned on the box; git OK.
#   LOOP    artifact channel (rsync a probe back) + peek loop (box log -> Mac outputs/remote-logs/).
#   AGENT   (full only) dispatch ops/prompts/PROMPT_fleet_selftest.md to the box via `cockpit run-b64`,
#           wait (bounded), then grep the mirrored log for `FLEET SELFTEST: PASS`. This exercises the
#           delegated-Claude path + the compute env (flygym/torch/CUDA/harness/baseline data) at once.
#
# PRECONDITIONS:
#   - export WIN_HOST="user@box-tailscale-name"   (same var cockpit.sh uses; optional WIN_BASE)
#   - For the AGENT check: commit `ops/prompts/PROMPT_fleet_selftest.md` on a branch the box checks out
#     (defaults to feat/n-rl-navigation) and make sure the box can pull it.
#
# Read-only/diagnostic: the only thing it writes is a tiny probe file under outputs/ (gitignored) on
# both sides, which it cleans up. It never commits, trains, or modifies tracked files.

set -uo pipefail   # NOT -e: we want to run every check and tally, not abort on the first failure.

MAC_BASE="$HOME/dev/jarvis"
CELL_MAC="$MAC_BASE/cellular-gaits"
PORT_MAC="$MAC_BASE/portfolio"
COCKPIT="$PORT_MAC/cockpit.sh"
WIN_HOST="${WIN_HOST:-}"
WIN_BASE="${WIN_BASE:-~/dev/jarvis}"
MAC_LOGS="$CELL_MAC/outputs/remote-logs"
BRANCH="${SELFTEST_BRANCH:-feat/n-rl-navigation}"
MODE="${1:-full}"

PASS=0; FAIL=0; FAILED=()
ok ()   { printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1)); }
no ()   { printf '  [FAIL] %s\n' "$1"; FAIL=$((FAIL+1)); FAILED+=("$1"); }
info () { printf '  [info] %s\n' "$1"; }
hdr ()  { printf '\n=== %s ===\n' "$1"; }
rsh ()  { ssh -o ConnectTimeout=10 "$WIN_HOST" "$@"; }

hdr "LOCAL (this Mac)"
[ -n "$WIN_HOST" ] && ok "WIN_HOST set ($WIN_HOST)" || { no "WIN_HOST not set — export WIN_HOST=\"user@box\""; }
command -v ssh   >/dev/null && ok "ssh present"   || no "ssh missing"
command -v rsync >/dev/null && ok "rsync present" || no "rsync missing (brew install rsync)"
command -v claude>/dev/null && ok "claude present (Mac sessions)" || no "claude missing on Mac"
[ -x "$COCKPIT" ] && ok "cockpit.sh present + executable" || no "cockpit.sh missing/not executable at $COCKPIT"
[ -d "$CELL_MAC/.git" ] && ok "cellular-gaits cloned locally" || no "cellular-gaits missing at $CELL_MAC"
[ -d "$PORT_MAC/.git" ] && ok "portfolio cloned locally" || no "portfolio missing at $PORT_MAC"

# Without a reachable host there's nothing more to test.
if [ -z "$WIN_HOST" ]; then
  printf '\nAbort: set WIN_HOST and re-run.\n'; exit 1
fi

hdr "LINK (Mac -> box over SSH/Tailscale)"
BOXINFO="$(rsh 'echo "$(hostname)|$(uname -sr)|$(nproc 2>/dev/null || echo ?)"' 2>/dev/null)"
if [ -n "$BOXINFO" ]; then
  ok "box reachable: $(echo "$BOXINFO" | tr '|' ' ')"
else
  no "box NOT reachable over SSH (check Tailscale up, WIN_HOST, key auth)"
  printf '\nAbort: cannot reach the box; fix connectivity first.\n'; exit 1
fi

hdr "BOX (tooling + repos on sentry)"
# One round trip: gather everything, print KEY=VALUE lines, parse locally.
BOXENV="$(rsh "
  echo uv=\$(command -v uv >/dev/null && uv --version 2>/dev/null | head -1 || echo MISSING)
  echo claude=\$(command -v claude >/dev/null && claude --version 2>/dev/null | head -1 || echo MISSING)
  echo tmux=\$(command -v tmux >/dev/null && tmux -V 2>/dev/null || echo MISSING)
  echo rsync=\$(command -v rsync >/dev/null && echo ok || echo MISSING)
  echo cellgit=\$( [ -d $WIN_BASE/cellular-gaits/.git ] && echo ok || echo MISSING )
  echo portgit=\$( [ -d $WIN_BASE/portfolio/.git ] && echo ok || echo MISSING )
  echo cellbranch=\$( git -C $WIN_BASE/cellular-gaits rev-parse --abbrev-ref HEAD 2>/dev/null || echo NONE )
" 2>/dev/null)"
getv () { echo "$BOXENV" | grep -E "^$1=" | head -1 | cut -d= -f2-; }
v="$(getv uv)";        [ "$v" != "MISSING" ] && [ -n "$v" ] && ok "uv on box ($v)"        || no "uv missing on box"
v="$(getv claude)";    [ "$v" != "MISSING" ] && [ -n "$v" ] && ok "claude on box ($v)"    || no "claude missing on box (delegated sessions won't run)"
v="$(getv tmux)";      [ "$v" != "MISSING" ] && [ -n "$v" ] && ok "tmux on box ($v)"      || no "tmux missing on box"
v="$(getv rsync)";     [ "$v" = "ok" ] && ok "rsync on box"                               || no "rsync missing on box"
v="$(getv cellgit)";   [ "$v" = "ok" ] && ok "cellular-gaits cloned on box"               || no "cellular-gaits missing on box ($WIN_BASE)"
v="$(getv portgit)";   [ "$v" = "ok" ] && ok "portfolio cloned on box"                    || no "portfolio missing on box"
info "box cellular-gaits branch: $(getv cellbranch)"

hdr "LOOP (artifact channel + peek observability)"
# artifact channel: write a probe into the gitignored outputs/ on the box, rsync it back, verify, clean.
PROBE="outputs/fleet_preflight_probe_$$.txt"
STAMP="preflight-$(date +%s)"
if rsh "mkdir -p $WIN_BASE/cellular-gaits/outputs && echo $STAMP > $WIN_BASE/cellular-gaits/$PROBE" 2>/dev/null; then
  TMPD="$(mktemp -d)"
  if rsync -azq -e ssh "$WIN_HOST:$WIN_BASE/cellular-gaits/$PROBE" "$TMPD/" 2>/dev/null && grep -q "$STAMP" "$TMPD"/*.txt 2>/dev/null; then
    ok "artifact channel (rsync box -> Mac) works"
  else
    no "artifact channel failed (rsync back did not deliver the probe)"
  fi
  rm -rf "$TMPD"
  rsh "rm -f $WIN_BASE/cellular-gaits/$PROBE" 2>/dev/null
else
  no "could not write probe on the box (check WIN_BASE path)"
fi

# peek loop: write a box-side cockpit log line, mirror via cockpit peek, verify it landed on the Mac.
if rsh "mkdir -p ~/cockpit-logs && echo $STAMP > ~/cockpit-logs/preflight.log" 2>/dev/null; then
  "$COCKPIT" peek preflight >/dev/null 2>&1
  if grep -q "$STAMP" "$MAC_LOGS/preflight.log" 2>/dev/null; then
    ok "peek loop (box log -> $MAC_LOGS) works"
  else
    no "peek loop failed (cockpit peek did not mirror the probe log)"
  fi
  rsh "rm -f ~/cockpit-logs/preflight.log" 2>/dev/null
else
  no "could not write a box-side cockpit log (check ~/cockpit-logs)"
fi

if [ "$MODE" = "quick" ]; then
  hdr "AGENT"; info "skipped (quick mode) — run without 'quick' to dispatch the box self-test"
else
  hdr "AGENT (delegated Claude self-test on the box)"
  echo "  putting box cellular-gaits on $BRANCH and pulling the self-test prompt ..."
  rsh "cd $WIN_BASE/cellular-gaits && git fetch --all -q && git checkout $BRANCH 2>/dev/null && git pull --ff-only" >/dev/null 2>&1 \
    || info "could not auto-set branch $BRANCH on the box (will still try; ensure the prompt is present)"
  if ! rsh "test -f $WIN_BASE/cellular-gaits/ops/prompts/PROMPT_fleet_selftest.md" 2>/dev/null; then
    no "PROMPT_fleet_selftest.md not on the box (commit+sync it on $BRANCH first); skipping dispatch"
  else
    DIR="Read ops/prompts/PROMPT_fleet_selftest.md and execute it exactly. Use a todo list. Read-only diagnostic: do not modify tracked files, do not commit, do not launch training. Print the summary block and stop."
    B64="$(printf %s "$DIR" | base64 | tr -d '\n')"
    before="$(rsh "tmux ls 2>/dev/null | grep -oE 'claude-[0-9]+' | sort -u" 2>/dev/null)"
    "$COCKPIT" run-b64 cellular-gaits "$B64" >/dev/null 2>&1
    sleep 4
    after="$(rsh "tmux ls 2>/dev/null | grep -oE 'claude-[0-9]+' | sort -u" 2>/dev/null)"
    SESS="$(comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after") 2>/dev/null | grep -E 'claude-[0-9]+' | head -1)"
    if [ -z "$SESS" ]; then
      no "delegated session did not start (no new tmux 'claude-*' on the box)"
    else
      ok "delegated session started on the box (tmux $SESS)"
      echo "  waiting for $SESS to finish (bounded ~10 min; the self-test runs uv sync + imports) ..."
      done_ok=0
      for _ in $(seq 1 40); do
        rsh "tmux has-session -t $SESS 2>/dev/null" || { done_ok=1; break; }
        sleep 15
      done
      scp -q "$WIN_HOST:cockpit-logs/$SESS.log" "$MAC_LOGS/$SESS.log" 2>/dev/null
      if [ "$done_ok" != 1 ]; then
        info "self-test still running after the timeout — check later: ./cockpit.sh peek $SESS"
      elif grep -q "FLEET SELFTEST: PASS" "$MAC_LOGS/$SESS.log" 2>/dev/null; then
        ok "box self-test reported: FLEET SELFTEST: PASS"
      elif grep -q "FLEET SELFTEST: FAIL" "$MAC_LOGS/$SESS.log" 2>/dev/null; then
        no "box self-test reported FAIL: $(grep 'FLEET SELFTEST: FAIL' "$MAC_LOGS/$SESS.log" | tail -1)"
      else
        no "box self-test produced no verdict line — inspect $MAC_LOGS/$SESS.log"
      fi
    fi
  fi
fi

hdr "RESULT"
printf '  %d passed, %d failed.\n' "$PASS" "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  printf '  FLEET PREFLIGHT: PASS — the cockpit <-> sentry path is wired and functional.\n'; exit 0
else
  printf '  FLEET PREFLIGHT: FAIL — %s\n' "$(IFS=, ; echo "${FAILED[*]}")"; exit 1
fi
