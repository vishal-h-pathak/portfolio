#!/usr/bin/env bash
#
# setup-escape-wave2.sh — stage the escape wave-2 sessions (SEQUENTIAL, both in portfolio).
#
#   X-C    portfolio   live launch-the-threat demo + flee clips + trajectory map   (content)
#   X-INT  portfolio   consolidate the escape tab onto one clean branch            (integrate)
#
# These are NOT parallel: X-INT consolidates X-C's working tree, so run X-C first, let it land
# and commit on feat/x-escape-live, THEN run X-INT. Same repo → run sequentially (no worktrees).
#
#   ./setup-escape-wave2.sh         # stage X-C   (default)
#   ./setup-escape-wave2.sh xint    # stage X-INT (after X-C has committed)
#
# X-A is already done and its data (escape_controller.json, flee clips, trajectories, metrics)
# is already copied into public/cellular-gaits/data-x/ — X-C consumes it, don't regenerate.
#
# Opens a Terminal tab, cd's in, creates the branch, launches claude, and PASTES the directive
# WITHOUT pressing Return (you review, then hit Return). macOS + Terminal.app; grant Terminal
# Accessibility for the auto-paste. If paste misfires, paste the PROMPT_*.md by hand.
# bypassPermissions: review before Return.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
STEP="${1:-xc}"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }

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

case "$STEP" in
  xc)
    [ -f "$PORTFOLIO/PROMPT_x_c_escape_live.md" ] || { echo "ERROR: X-C prompt missing in $PORTFOLIO"; exit 1; }
    [ -f "$PORTFOLIO/public/cellular-gaits/data-x/escape_controller.json" ] || \
      { echo "ERROR: data-x/escape_controller.json missing — copy X-A's outputs/web_data_x/ first."; exit 1; }
    open_session "$PORTFOLIO" \
      "git checkout feat/x-escape-scaffold 2>/dev/null || git checkout main; git checkout -b feat/x-escape-live 2>/dev/null || git checkout feat/x-escape-live" \
      "Read ./PROMPT_x_c_escape_live.md and implement it exactly on branch feat/x-escape-live. Use a todo list. Commit on the branch when done; do not merge to main. Do not begin until I confirm."
    cat <<DONE

X-C staged (portfolio). Directive PASTED, not submitted — review and press Return to start.
When it lands and commits on feat/x-escape-live, run:  ./setup-escape-wave2.sh xint
DONE
    ;;
  xint)
    [ -f "$PORTFOLIO/PROMPT_x_int_escape.md" ] || { echo "ERROR: X-INT prompt missing in $PORTFOLIO"; exit 1; }
    open_session "$PORTFOLIO" \
      "git checkout feat/x-escape-live 2>/dev/null || git checkout main" \
      "Read ./PROMPT_x_int_escape.md and implement it exactly. Use a todo list. Commit the consolidation branch; do not merge or push to main. Do not begin until I confirm."
    cat <<DONE

X-INT staged (portfolio). Directive PASTED, not submitted — review and press Return to start.
After it reports green, ship via the Vercel branch-preview → git push origin <branch>:main flow.
DONE
    ;;
  *)
    echo "usage: ./setup-escape-wave2.sh [xc|xint]"; exit 1 ;;
esac
