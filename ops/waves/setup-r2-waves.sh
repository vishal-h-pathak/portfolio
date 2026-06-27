#!/usr/bin/env bash
#
# setup-r2-waves.sh — stage the two parallel Round-2 sessions.
#
# Two sessions, two different repos (one session per repo, so no cross-session conflicts):
#   - R2-WP1  portfolio       bug sweep + UX (back-nav, resets, blank clips, overlap cleanup)
#   - R2-WP2  cellular-gaits  legible-camera re-render + brain-XYZ feasibility spike
#
# It opens a Terminal tab for each, cd's in, sets up the branch, launches claude, and PASTES
# the directive WITHOUT pressing Return (you review, then hit Return to start).
#
# Run from anywhere:  bash setup-r2-waves.sh
#
# Requirements: macOS + Terminal.app; grant Terminal Accessibility (System Settings >
# Privacy & Security > Accessibility) for the auto-paste. If paste misfires, each prompt path
# is printed at the end — paste the one-line directive by hand. bypassPermissions = review before Return.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
CELLGAITS="$HOME/dev/jarvis/cellular-gaits"
P1="$PORTFOLIO/ops/prompts/PROMPT_cg_r2wp1_bugsweep.md"
P2="$CELLGAITS/ops/prompts/PROMPT_cg_r2wp2_render_spike.md"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -f "$P1" ] || { echo "ERROR: R2-WP1 prompt missing: $P1"; exit 1; }
[ -f "$P2" ] || { echo "ERROR: R2-WP2 prompt missing: $P2"; exit 1; }

open_session () {
  local dir="$1" setup="$2" directive="$3"
  osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$dir' && { $setup ; } && claude --permission-mode bypassPermissions" in front window
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

# R2-WP1 — portfolio. Worktree off feat/cg-redesign (the main checkout sits on the watcher branch
# with WIP, so we never touch it). npm install is done by the session per its prompt.
open_session "$PORTFOLIO" \
  "git fetch origin >/dev/null 2>&1 ; git worktree add -b feat/cg-r2wp1 ../portfolio-wt/r2wp1 feat/cg-redesign 2>/dev/null || true ; cd ../portfolio-wt/r2wp1" \
  "Read $P1 and implement it exactly. You are already on branch feat/cg-r2wp1 in worktree ../portfolio-wt/r2wp1 (off feat/cg-redesign); run npm install first, then proceed. Commit on this branch, do not merge. Do not begin until I confirm."

# R2-WP2 — cellular-gaits. Branch in place off feat/n-rl-navigation (no other session uses this repo).
open_session "$CELLGAITS" \
  "git checkout -b feat/cg-r2-render 2>/dev/null || git checkout feat/cg-r2-render ; mkdir -p outputs/r2_clips outputs/r2_spike" \
  "Read $P2 and implement it exactly on branch feat/cg-r2-render. Stage clips/positions under outputs/ (do not write into ../portfolio this wave). Commit on this branch, do not merge. Do not begin until I confirm."

cat <<DONE

Two tabs staged — R2-WP1 (portfolio) and R2-WP2 (cellular-gaits). Each has its one-line directive
PASTED, not submitted: review it, then press Return to start. (bypassPermissions is on — review first.)

Prompts:
  R2-WP1  $P1
  R2-WP2  $P2

When both finish: integrate WP2's outputs/r2_clips into the portfolio bundles on feat/cg-redesign,
merge feat/cg-r2wp1, then WP3 (per-page intuition) and — if the XYZ spike is green — WP4 (the
escape-circuit point cloud).
DONE
