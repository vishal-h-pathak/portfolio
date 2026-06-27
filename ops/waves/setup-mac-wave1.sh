#!/usr/bin/env bash
#
# setup-mac-wave1.sh — stage Mac wave 1: WP4 (the escape-circuit point cloud) + two nits.
#
# One portfolio session, working in-place in the cg-redesign worktree on feat/cg-redesign (the
# deploy/integration branch) so it iterates against the live dev server. No new worktree/branch —
# it's the only session on that branch. Opens a Terminal tab, cd's in, launches claude, and PASTES
# the directive WITHOUT pressing Return (review, then Return to start).
#
# Run from anywhere:  bash setup-mac-wave1.sh
# Requirements: macOS + Terminal.app; Terminal Accessibility for the auto-paste. bypassPermissions
# = review before Return. If the paste misfires, the prompt path + directive print at the end.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
CGWT="$HOME/dev/jarvis/portfolio-wt/cg-redesign"
PROMPT="$PORTFOLIO/ops/prompts/PROMPT_cg_wp4_pointcloud.md"
POSITIONS="$HOME/dev/jarvis/cellular-gaits/outputs/r2_spike/positions.json"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -d "$CGWT" ]      || { echo "ERROR: cg-redesign worktree not found at $CGWT"; exit 1; }
[ -f "$PROMPT" ]    || { echo "ERROR: prompt not found: $PROMPT"; exit 1; }
[ -f "$POSITIONS" ] || { echo "WARN: $POSITIONS not found — WP4 needs it for the point cloud. Continue anyway? (Ctrl-C to abort)"; read -r _; }

DIRECTIVE="Read $PROMPT and implement it exactly on feat/cg-redesign in this worktree (work in-place; the dev server is live here). Commit when done; do NOT push — I'll QA on localhost and push. Do not begin until I confirm."

osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$CGWT' && echo '──────── Mac wave 1 · WP4 point cloud + nits · feat/cg-redesign ────────' && claude --permission-mode bypassPermissions" in front window
end tell
OSA
sleep 6
osascript <<OSA
set the clipboard to "$DIRECTIVE"
tell application "Terminal" to activate
delay 0.3
tell application "System Events" to keystroke "v" using command down
OSA

cat <<DONE

Staged Mac wave 1 — WP4 (escape-circuit point cloud) + the nav-label & Sensing-connector nits.
The directive is PASTED, not submitted: review it, press Return to start. (bypassPermissions — review first.)

Prompt: $PROMPT

When it reports: QA on localhost, then ship with —
  cd $CGWT
  git push origin feat/cg-redesign:main
  git fetch origin && git branch -f main origin/main

Next after this: Mac wave 2 (cellular-gaits renders — checkpoint check, S&O clips if renderable,
legible perturbation/chemotaxis re-renders, 139k backdrop), then wave 3 (wire those clips in).
DONE
