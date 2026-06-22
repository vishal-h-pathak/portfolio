#!/usr/bin/env bash
#
# setup-campaign2-wave1.sh — stage the two parallel Campaign-2 wave-1 sessions.
#
# Two sessions, two different repos (so no worktrees needed — one session per repo):
#   - C2-A  cellular-gaits  close the loop + perturbation + re-evolve   (compute job)
#   - C2-B  portfolio       behaviors tab group + closed-loop visuals    (content/visuals)
#
# It opens a Terminal tab for each, cd's in, creates the branch, launches claude, and PASTES
# the directive WITHOUT pressing Return (you review, then hit Return to start).
#
# Run from anywhere:  bash setup-campaign2-wave1.sh
#
# Requirements: macOS + Terminal.app; grant Terminal Accessibility (System Settings >
# Privacy & Security > Accessibility) for the auto-paste. If paste misfires, each repo has
# its PROMPT_*.md — just paste the directive by hand. bypassPermissions = review before Return.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
CELLGAITS="$HOME/dev/jarvis/cellular-gaits"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -f "$CELLGAITS/PROMPT_c2a_closed_loop.md" ] || { echo "ERROR: C2-A prompt missing in $CELLGAITS"; exit 1; }
[ -f "$PORTFOLIO/PROMPT_c2b_behaviors_scaffold.md" ] || { echo "ERROR: C2-B prompt missing in $PORTFOLIO"; exit 1; }

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

# C2-A — cellular-gaits (its own branch in its own repo)
open_session "$CELLGAITS" \
  "git checkout -b feat/c2-closed-loop 2>/dev/null || git checkout feat/c2-closed-loop" \
  "Read ./PROMPT_c2a_closed_loop.md and implement it exactly on branch feat/c2-closed-loop. Do not begin until I confirm."

# C2-B — portfolio (branch off the shipped redesign on main; falls back to feat/cg-redesign)
open_session "$PORTFOLIO" \
  "git checkout -b feat/c2-behaviors-scaffold 2>/dev/null || git checkout feat/c2-behaviors-scaffold" \
  "Read ./PROMPT_c2b_behaviors_scaffold.md and implement it exactly on branch feat/c2-behaviors-scaffold. If main lacks the cellular-gaits redesign, rebase this branch onto feat/cg-redesign first. Do not begin until I confirm."

cat <<DONE

Two tabs staged (C2-A in cellular-gaits, C2-B in portfolio). Each has its directive PASTED,
not submitted — review and press Return to start.

When both finish: commit each branch, copy C2-A's outputs/web_data_c2/ into
portfolio/public/cellular-gaits/data-c2/, then I'll hand you C2-C (wire the live closed-loop
demo + recovery clips into /behaviors/perturbation) and the integration step.
DONE
