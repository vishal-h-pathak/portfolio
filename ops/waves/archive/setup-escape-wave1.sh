#!/usr/bin/env bash
#
# setup-escape-wave1.sh — stage the two parallel escape wave-1 sessions.
#
#   X-A  cellular-gaits  looming sensor + threat + escape fitness + re-evolve   (compute)
#   X-B  portfolio       /behaviors/escape scaffold + connectome-bridge visual  (content)
#
# One session per repo (no worktrees needed). Opens a Terminal tab for each, cd's in, creates
# the branch, launches claude, and PASTES the directive WITHOUT pressing Return (you review,
# then hit Return). macOS + Terminal.app; grant Terminal Accessibility for the auto-paste.
# If paste misfires, each repo has its PROMPT_*.md — paste by hand. bypassPermissions: review
# before Return.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
CELLGAITS="$HOME/dev/jarvis/cellular-gaits"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -f "$CELLGAITS/PROMPT_x_a_escape.md" ] || { echo "ERROR: X-A prompt missing in $CELLGAITS"; exit 1; }
[ -f "$PORTFOLIO/PROMPT_x_b_escape_scaffold.md" ] || { echo "ERROR: X-B prompt missing in $PORTFOLIO"; exit 1; }

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

# X-A — cellular-gaits (off the chemotaxis branch so the 8->16 sensor plumbing exists)
open_session "$CELLGAITS" \
  "git checkout feat/ch-chemotaxis 2>/dev/null; git checkout -b feat/x-escape 2>/dev/null || git checkout feat/x-escape" \
  "Read ./PROMPT_x_a_escape.md and implement it exactly on branch feat/x-escape. Validation-first: build everything, do the short calibration run, then stop and report before the full evolution. Do not begin until I confirm."

# X-B — portfolio (off the consolidated Campaign-2 line; fall back to main if already shipped)
open_session "$PORTFOLIO" \
  "git checkout feat/cg-campaign2 2>/dev/null || git checkout main; git checkout -b feat/x-escape-scaffold 2>/dev/null || git checkout feat/x-escape-scaffold" \
  "Read ./PROMPT_x_b_escape_scaffold.md and implement it exactly on branch feat/x-escape-scaffold. Do not begin until I confirm."

cat <<DONE

Two tabs staged (X-A cellular-gaits, X-B portfolio). Each has its directive PASTED, not
submitted — review and press Return to start.

X-A will stop after a short calibration run for your go-ahead before the full evolution.
When both land: commit each branch, copy X-A's outputs/web_data_x/ to
portfolio/public/cellular-gaits/data-x/, then I'll hand you X-C (live launch-the-threat demo)
and the consolidation step.
DONE
