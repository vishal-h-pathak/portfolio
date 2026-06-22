#!/usr/bin/env bash
#
# setup-wave3.sh — stage 7 Claude Code sessions for the cellular-gaits wave-3 tabs.
#
# What it does (it does NOT start the tasks — it leaves each prompt typed, unsent):
#   - one git worktree per tab (separate folder) so the 7 sessions never collide
#   - a branch per tab off the integration branch
#   - symlinks node_modules + copies .env.local so each worktree can build
#   - copies the (gitignored) prompt files into each worktree
#   - opens a Terminal tab, cd's in, launches claude, and PASTES the directive
#     without hitting Enter (you review, then press Return yourself)
#
# Run from the portfolio repo root:  bash setup-wave3.sh
#
# Requirements / caveats:
#   - macOS + Terminal.app.
#   - Grant Accessibility to Terminal: System Settings > Privacy & Security >
#     Accessibility (needed for the auto-paste keystroke). If paste doesn't land,
#     each worktree already has the prompt files — just paste the directive manually.
#   - The integration branch must already exist (see PROMPT_cg_E_conventions.md):
#       feat/cg-redesign = C + B + G + assets, build green. This script will NOT
#       create it (that merge can conflict and needs your eyes).
#   - bypassPermissions lets CC act without prompts. That's what you asked for; it
#     also means review each session before pressing Return.

set -euo pipefail

BASE_BRANCH="feat/cg-redesign"
CONV="PROMPT_cg_E_conventions.md"
PORTFOLIO="$(pwd)"
WT_ROOT="$(cd .. && pwd)/cg-wt"

# id | branch | prompt file
TABS=(
  "e1|feat/cg-e1-body|PROMPT_cg_E1_body.md"
  "e2|feat/cg-e2-controller|PROMPT_cg_E2_controller.md"
  "e3|feat/cg-e3-sensing|PROMPT_cg_E3_sensing.md"
  "e4|feat/cg-e4-mapping|PROMPT_cg_E4_mapping.md"
  "e5|feat/cg-e5-objective|PROMPT_cg_E5_objective.md"
  "e6|feat/cg-e6-optimizer|PROMPT_cg_E6_optimizer.md"
  "e7|feat/cg-e7-embodied|PROMPT_cg_E7_embodied.md"
)

# --- preconditions ---
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERROR: run from the portfolio git repo root."; exit 1; }
[ -f "$CONV" ] || { echo "ERROR: $CONV not found — run from portfolio root."; exit 1; }
git show-ref --verify --quiet "refs/heads/$BASE_BRANCH" || {
  echo "ERROR: branch '$BASE_BRANCH' does not exist."
  echo "Create it first (merge B + G onto C, commit assets) — see $CONV. Then re-run."
  exit 1
}
command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }

mkdir -p "$WT_ROOT"

echo "Staging ${#TABS[@]} worktrees under $WT_ROOT (base: $BASE_BRANCH)"

for entry in "${TABS[@]}"; do
  IFS='|' read -r id branch prompt <<< "$entry"
  wt="$WT_ROOT/$id"
  [ -f "$PORTFOLIO/$prompt" ] || { echo "  skip $id: $prompt missing"; continue; }

  if [ ! -d "$wt" ]; then
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git worktree add "$wt" "$branch"
    else
      git worktree add -b "$branch" "$wt" "$BASE_BRANCH"
    fi
  else
    echo "  worktree $wt already exists — reusing"
  fi

  # deps so each worktree can `npm run build`
  [ -e "$wt/node_modules" ] || ln -s "$PORTFOLIO/node_modules" "$wt/node_modules"
  [ -f "$PORTFOLIO/.env.local" ] && cp "$PORTFOLIO/.env.local" "$wt/.env.local" 2>/dev/null || true

  # prompts are gitignored, so they aren't in the worktree — copy them in
  cp "$PORTFOLIO/$CONV" "$PORTFOLIO/$prompt" "$wt/"

  directive="Read ./$CONV then ./$prompt and implement ${id} exactly as specified on this branch ($branch). Do not begin until I confirm."

  osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$wt' && claude --permission-mode bypassPermissions" in front window
end tell
OSA

  # let claude boot, then paste the directive WITHOUT pressing Return
  sleep 4
  osascript <<OSA
set the clipboard to "$directive"
tell application "Terminal" to activate
delay 0.3
tell application "System Events" to keystroke "v" using command down
OSA

  echo "  staged $id  ->  $wt  ($branch)"
done

cat <<DONE

All tabs staged. Each session has the prompt PASTED but NOT submitted — review and
press Return to start it.

When a tab finishes, commit on its branch. Then run wave 4:  PROMPT_cg_F_integrate.md

Teardown when you're done with a worktree:
  git worktree remove ../cg-wt/e1   # etc.  (add --force if it complains)
  git branch -d feat/cg-e1-body     # if abandoning that branch
DONE
