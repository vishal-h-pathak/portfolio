#!/usr/bin/env bash
#
# setup-cx-calibrate.sh — the parallel wave that begins the connectome endgame while finishing nav RL.
# Two independent sessions, different machines (so no worktree clash between them):
#
#   CALIBRATE  -> SENTRY (WIN), delegated Claude session via cockpit `run` (claude is now on the box):
#                 cellular-gaits @ feat/n-rl-navigation — wire env+policy+ppo, run the 4-gate
#                 calibration on the PHYSICAL task, write ops/reports/REPORT_n_rl_calibration.md, STOP.
#                 Runs on the box because the calibration needs flygym + web_data_n (the N-A baseline)
#                 + web_data_ch + the cores, which all live there.
#   CONNECTOME -> MAC, a fresh Claude Code session in its own git WORKTREE (needs network for FlyWire):
#                 cellular-gaits @ feat/cx-connectome (off feat/n-rl-navigation) — extract the real
#                 LC4/LPLC2->DNp01 escape sub-circuit into a curated artifact + provenance, STOP at the
#                 data-access validation gate. This is CX-1, wave 1 of the connectome milestone.
#
#   ./ops/waves/setup-cx-calibrate.sh            # both (default)
#   ./ops/waves/setup-cx-calibrate.sh connectome # only the Mac connectome session
#   ./ops/waves/setup-cx-calibrate.sh calibrate  # only the sentry calibration dispatch
#
# PRECONDITIONS:
#   - Commit the new/updated prompts on feat/n-rl-navigation FIRST (both sessions read them from
#     ops/prompts/ on that branch; the worktree + the box pull check it out):
#       ops/prompts/PROMPT_n_rl_2_integrate.md  (amended)   ops/prompts/PROMPT_cx_1_extract.md  (new)
#   - The box pulls feat/n-rl-navigation, so it must be reachable by the box's pull (commit on the Mac).
#   - export WIN_HOST="user@box-tailscale-name"   (for the sentry dispatch; same var cockpit.sh uses)
#
# The Mac session PASTES its directive WITHOUT pressing Return (review, then Return). macOS + Terminal.app;
# grant Terminal Accessibility for the auto-paste. The sentry dispatch is headless but GUARDED by a
# [y/N] prompt and STOPS after the calibration (the prompt enforces the gate). bypassPermissions both.

set -euo pipefail

MAC_BASE="$HOME/dev/jarvis"
CELLGAITS="$MAC_BASE/cellular-gaits"
COCKPIT="$MAC_BASE/portfolio/cockpit.sh"
BASE_BRANCH="feat/n-rl-navigation"
WIN_HOST="${WIN_HOST:-}"
WIN_BASE="${WIN_BASE:-~/dev/jarvis}"
WHICH="${1:-both}"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH (needed for the Mac session)."; exit 1; }
git -C "$CELLGAITS" rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1 \
  || { echo "ERROR: branch $BASE_BRANCH missing in $CELLGAITS."; exit 1; }

# --- open a Mac Terminal tab: cd, setup, launch claude, then PASTE the directive unsubmitted ---
open_session () {
  local dir="$1" setup="$2" directive="$3"
  osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$dir' && $setup && claude --permission-mode bypassPermissions" in front window
end tell
OSA
  sleep 4
  osascript <<OSA
set the clipboard to "$directive"
tell application "Terminal" to activate
delay 0.3
tell application "System Events" to keystroke "v" using command down
OSA
}

# --- CONNECTOME (Mac, fresh worktree off the base branch) ---
launch_connectome () {
  local wt="$MAC_BASE/cg-cx"
  local prompt="ops/prompts/PROMPT_cx_1_extract.md"
  if [ ! -d "$wt" ]; then
    git -C "$CELLGAITS" worktree add "$wt" -b "feat/cx-connectome" "$BASE_BRANCH" \
      || git -C "$CELLGAITS" worktree add "$wt" "feat/cx-connectome"
  fi
  [ -f "$wt/$prompt" ] || { echo "ERROR: $prompt not on $BASE_BRANCH — commit the new prompts first."; exit 1; }
  open_session "$wt" "uv sync" \
    "Read ./$prompt and implement it EXACTLY on branch feat/cx-connectome. Use a todo list. This is DATA ONLY — do not touch the rl/ harness or any prior behavior. STOP at the data-access validation gate (confirm a public FlyWire source + sample the schema) and report before any bulk pull. Commit on your branch when the artifact + report land; do not merge. Do not begin until I confirm."
  echo "Connectome tab staged on the Mac (worktree: $wt, branch feat/cx-connectome). Directive PASTED, not submitted."
}

# --- CALIBRATE (sentry, delegated Claude session via cockpit run) ---
launch_calibrate () {
  [ -n "$WIN_HOST" ] || { echo "ERROR: export WIN_HOST=\"user@box\" to dispatch the calibration to sentry."; exit 1; }
  [ -x "$COCKPIT" ] || { echo "ERROR: $COCKPIT not found/executable."; exit 1; }
  echo "Putting sentry's cellular-gaits on $BASE_BRANCH and pulling ..."
  ssh "$WIN_HOST" "cd $WIN_BASE/cellular-gaits && git fetch --all -q && git checkout $BASE_BRANCH && git pull --ff-only" \
    || echo "WARN: couldn't set the branch on the box automatically — verify the box is on $BASE_BRANCH with the latest commit, then re-run 'calibrate'."
  read -rp "Dispatch integrate+calibrate to sentry now? (headless; STOPS after the 4-gate calibration) [y/N] " ok
  [ "$ok" = "y" ] || { echo "Skipped sentry dispatch. Re-run with 'calibrate' when ready."; return 0; }
  "$COCKPIT" run cellular-gaits "Read ops/prompts/PROMPT_n_rl_2_integrate.md and implement it exactly on feat/n-rl-navigation. Use a todo list. Wire env+policy+ppo, run the four-gate calibration on the physical task with w_collide 0.75 and the Newton cap dropped, write ops/reports/REPORT_n_rl_calibration.md, then STOP and do NOT launch the full run. Commit and push on feat/n-rl-navigation."
  echo "Dispatched to sentry (headless). Pull the report when it STOPS:  ./cockpit.sh peek <name>  (name printed above), then  ./cockpit.sh pull"
}

case "$WHICH" in
  both)       launch_connectome; launch_calibrate ;;
  connectome) launch_connectome ;;
  calibrate)  launch_calibrate ;;
  *) echo "usage: ./ops/waves/setup-cx-calibrate.sh [both|connectome|calibrate]"; exit 1 ;;
esac

cat <<DONE

--------------------------------------------------------------------------------
Wave staged. Two tracks now run in parallel:
  - SENTRY: nav RL integrate + 4-gate calibration -> ops/reports/REPORT_n_rl_calibration.md (STOPs).
  - MAC:    CX-1 connectome extraction (worktree ~/dev/jarvis/cg-cx, feat/cx-connectome) (STOPs at
            the data-access gate).
Claim both branches in docs/cellular-gaits/SYNC.md (sentry: feat/n-rl-navigation; Mac: feat/cx-connectome).

When the connectome session finishes:
  cd $CELLGAITS && git worktree remove ~/dev/jarvis/cg-cx
Send me either REPORT and I'll give the go/no-go (full nav run) or green-light CX-2 (the ConnectomePolicy).
--------------------------------------------------------------------------------
DONE
