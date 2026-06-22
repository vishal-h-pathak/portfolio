#!/usr/bin/env bash
#
# setup-chemotaxis-wave1.sh — stage the two parallel chemotaxis wave-1 sessions.
#
#   CH-A  cellular-gaits  bilateral gradient sensor + reach-the-source + re-evolve  (compute)
#   CH-B  portfolio       /behaviors/chemotaxis scaffold + gradient visual          (content)
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
[ -f "$CELLGAITS/PROMPT_ch_a_chemotaxis.md" ] || { echo "ERROR: CH-A prompt missing in $CELLGAITS"; exit 1; }
[ -f "$PORTFOLIO/PROMPT_ch_b_chemotaxis_scaffold.md" ] || { echo "ERROR: CH-B prompt missing in $PORTFOLIO"; exit 1; }

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

# CH-A — cellular-gaits
open_session "$CELLGAITS" \
  "git checkout -b feat/ch-chemotaxis 2>/dev/null || git checkout feat/ch-chemotaxis" \
  "Read ./PROMPT_ch_a_chemotaxis.md and implement it exactly on branch feat/ch-chemotaxis. Validation-first: build everything, do the short calibration run, then stop and report before the full evolution. Do not begin until I confirm."

# CH-B — portfolio (off the current fly line, which has the Behaviors group)
open_session "$PORTFOLIO" \
  "git checkout feat/c2-perturbation 2>/dev/null; git checkout -b feat/ch-chemotaxis-scaffold 2>/dev/null || git checkout feat/ch-chemotaxis-scaffold" \
  "Read ./PROMPT_ch_b_chemotaxis_scaffold.md and implement it exactly on branch feat/ch-chemotaxis-scaffold. Do not begin until I confirm."

cat <<DONE

Two tabs staged (CH-A cellular-gaits, CH-B portfolio). Each has its directive PASTED, not
submitted — review and press Return to start.

CH-A will stop after a short calibration run for your go-ahead before the full evolution.
When both land: commit each branch, copy CH-A's outputs/web_data_ch/ to
portfolio/public/cellular-gaits/data-ch/, then I'll hand you CH-C (wire the live
place-the-source demo + trajectory viz) + integration.
DONE
