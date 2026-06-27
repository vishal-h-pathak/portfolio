#!/usr/bin/env bash
#
# setup-mac-wave3.sh — stage Mac wave 3: wire the wave-2 render assets into the site.
#
# One portfolio session, in-place in the cg-redesign worktree on feat/cg-redesign (dev server live there).
# It copies the staged wave-2 assets (gait clips, legible behavior clips, brain backdrop) into the
# portfolio bundles and wires them up. Opens a Terminal tab, launches claude, PASTES the directive
# WITHOUT pressing Return (review, then Return to start).
#
# Run from anywhere:  bash setup-mac-wave3.sh
# Requirements: macOS + Terminal.app; Terminal Accessibility for the auto-paste. bypassPermissions
# = review before Return.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
CGWT="$HOME/dev/jarvis/portfolio-wt/cg-redesign"
PROMPT="$PORTFOLIO/ops/prompts/PROMPT_cg_wire_w3.md"
ASSETS="$HOME/dev/jarvis/cellular-gaits/outputs/r2_renders_w2"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -d "$CGWT" ]   || { echo "ERROR: cg-redesign worktree not found at $CGWT"; exit 1; }
[ -f "$PROMPT" ] || { echo "ERROR: prompt not found: $PROMPT"; exit 1; }
[ -d "$ASSETS" ] || { echo "WARN: wave-2 assets not found at $ASSETS — run Mac wave 2 first. Continue anyway? (Ctrl-C to abort)"; read -r _; }

DIRECTIVE="Read $PROMPT and implement it exactly on feat/cg-redesign in this worktree (work in-place; dev server is live here). Its spec is ../cellular-gaits/ops/reports/REPORT_cg_renders_w2.md (exact staged filenames + paths + backdrop schema); the assets are in $ASSETS. Wire the S&O gait filmstrip, swap the legible behavior clips, and add the point-cloud backdrop. Commit when done; do NOT push — I'll QA on localhost and push. Do not begin until I confirm."

osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$CGWT' && echo '──────── Mac wave 3 · wire render assets · feat/cg-redesign ────────' && claude --permission-mode bypassPermissions" in front window
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

Staged Mac wave 3 — wires wave-2's assets in (S&O gait filmstrip, legible behavior clips, brain backdrop).
Directive PASTED, not submitted: review, press Return to start. (bypassPermissions — review first.)

Prompt: $PROMPT
Assets: $ASSETS

When it reports: QA on localhost (the 3 gait clips play side-by-side, the behavior clips read legibly,
the point cloud has its dim full-brain backdrop), then ship:
  cd $CGWT
  git push origin feat/cg-redesign:main
  git fetch origin && git branch -f main origin/main

After this, the Mac plan is done — only the WIN nav-training job and the WP5 optic-lobe horizon remain.
DONE
