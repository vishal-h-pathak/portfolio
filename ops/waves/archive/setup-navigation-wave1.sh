#!/usr/bin/env bash
#
# setup-navigation-wave1.sh — stage the two parallel navigation wave-1 sessions.
#
#   N-A  cellular-gaits  feelers + obstacle arena + seek-vs-avoid fitness + re-evolve   (compute)
#   N-B  portfolio       /behaviors/navigation scaffold + seek-vs-avoid arbitration viz (content)
#
# One session per repo (no worktrees). Opens a Terminal tab for each, cd's in, creates the
# branch, launches claude, and PASTES the directive WITHOUT pressing Return (you review, then
# hit Return). macOS + Terminal.app; grant Terminal Accessibility for the auto-paste. If paste
# misfires, each repo has its PROMPT_*.md — paste by hand. bypassPermissions: review before Return.
#
# N-A is VALIDATION-FIRST: it builds everything, runs a short calibration, then STOPS for your
# go-ahead before the full evolution (warm-started from the trained chemotaxis controller, +2
# bilateral obstacle feelers, ~1524 params). N-B needs no trained data and runs fully in parallel.
#
# Wave 2 (N-C, the live place-the-goal/drag-the-obstacles demo) is written AFTER N-A exports its
# sensor spec — same as escape's X-C followed X-A.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
CELLGAITS="$HOME/dev/jarvis/cellular-gaits"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -f "$CELLGAITS/PROMPT_n_a_navigation.md" ] || { echo "ERROR: N-A prompt missing in $CELLGAITS"; exit 1; }
[ -f "$PORTFOLIO/PROMPT_n_b_navigation_scaffold.md" ] || { echo "ERROR: N-B prompt missing in $PORTFOLIO"; exit 1; }

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

# N-A — cellular-gaits (off feat/x-escape = main+closed-loop+chemo+escape, the full sensor
# plumbing; warm-starts from the trained chemotaxis controller in outputs/web_data_ch/).
# NOTE: the cellular-gaits escape COMPUTE branch is feat/x-escape (22a162d); feat/x-escape-live
# is the PORTFOLIO branch (X-C). Don't confuse them.
open_session "$CELLGAITS" \
  "git checkout feat/x-escape 2>/dev/null || git checkout main; git checkout -b feat/n-navigation 2>/dev/null || git checkout feat/n-navigation" \
  "Read ./PROMPT_n_a_navigation.md and implement it exactly on branch feat/n-navigation. Validation-first: build everything, run the short calibration, then STOP and report before the full evolution. Commit on the branch when you stop. Do not begin until I confirm."

# N-B — portfolio (off the shipped escape line; fall back to main)
open_session "$PORTFOLIO" \
  "git checkout feat/x-escape-live 2>/dev/null || git checkout main; git checkout -b feat/n-navigation-scaffold 2>/dev/null || git checkout feat/n-navigation-scaffold" \
  "Read ./PROMPT_n_b_navigation_scaffold.md and implement it exactly on branch feat/n-navigation-scaffold. Commit on the branch when done; do not merge to main. Do not begin until I confirm."

cat <<DONE

Two tabs staged (N-A cellular-gaits, N-B portfolio). Each has its directive PASTED, not
submitted — review and press Return to start.

N-A will STOP after a short calibration run for your go-ahead before the full evolution. Send me
its calibration report and I'll green-light the full run and write N-C (the live demo) + the
wave-2 script. When both land, copy N-A's exported web_data_n*/ into
portfolio/public/cellular-gaits/data-n/ (I can do that copy for you).
DONE
