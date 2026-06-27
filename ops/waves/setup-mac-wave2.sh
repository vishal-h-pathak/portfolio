#!/usr/bin/env bash
#
# setup-mac-wave2.sh — stage Mac wave 2: the cellular-gaits render batch.
#
# One cellular-gaits session on the Mac (MuJoCo replay renders + a positions extraction). It branches
# feat/cg-renders-w2 off feat/cg-r2-render (which has the WP2 world-fixed cameras), launches claude, and
# PASTES the directive WITHOUT pressing Return (review, then Return to start). Stages everything under
# outputs/ — the portfolio wiring is a later wave.
#
# Run from anywhere:  bash setup-mac-wave2.sh
# Requirements: macOS + Terminal.app; Terminal Accessibility for the auto-paste. bypassPermissions
# = review before Return. The prompt path + directive print at the end if the paste misfires.

set -euo pipefail

CELLGAITS="$HOME/dev/jarvis/cellular-gaits"
PROMPT="$CELLGAITS/ops/prompts/PROMPT_cg_renders_w2.md"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -d "$CELLGAITS" ] || { echo "ERROR: cellular-gaits repo not found at $CELLGAITS"; exit 1; }
[ -f "$PROMPT" ]    || { echo "ERROR: prompt not found: $PROMPT"; exit 1; }

DIRECTIVE="Read $PROMPT and implement it exactly. Branch feat/cg-renders-w2 off feat/cg-r2-render; stage all renders/positions under outputs/ and do NOT write into ../portfolio (that's a later wave). Do Task 1 (the checkpoint verdict) FIRST and tell me whether the S&O gait clips are Mac-renderable or need a WIN re-run before going further. Commit the scripts on your branch, do NOT push. Do not begin until I confirm."

osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$CELLGAITS' && git checkout -b feat/cg-renders-w2 2>/dev/null || git checkout feat/cg-renders-w2 ; mkdir -p outputs/r2_renders_w2 ; echo '──────── Mac wave 2 · cellular-gaits renders · feat/cg-renders-w2 ────────' && claude --permission-mode bypassPermissions" in front window
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

Staged Mac wave 2 — cellular-gaits render batch (S&O gait clips + behavior re-renders + 139k brain
backdrop). Directive PASTED, not submitted: review, press Return to start. (bypassPermissions — review first.)

Prompt: $PROMPT

It reports the checkpoint verdict first (S&O clips = Mac or WIN), then stages assets under
outputs/r2_renders_w2/. When it's done, Mac wave 3 (portfolio) wires the clips + backdrop into the site.
DONE
