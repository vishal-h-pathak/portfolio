#!/usr/bin/env bash
#
# setup-eb-wave1.sh — Embodied Brain, wave 1: the two independent foundation sessions, in parallel,
# BOTH ON THE MAC (no sentry — the Shiu LIF brain is laptop-runnable and the body is MuJoCo).
#
#   EB-0A  brain   feat/eb-brain   src/cellular_gaits/brain/   (vendor Shiu LIF + clean API)
#   EB-0C  body    feat/eb-body    src/cellular_gaits/embodied/body.py  (escape motor primitive)
#
# Independent files (brain/ vs embodied/), so they run in parallel on separate git WORKTREES off `main`.
# Opens a Terminal tab per session, cd's into the worktree, launches claude, and PASTES the directive
# UNSUBMITTED (review, press Return). macOS + Terminal.app; grant Terminal Accessibility for auto-paste.
#
#   Run from the fleet/portfolio repo root on the Mac:  ./ops/waves/setup-eb-wave1.sh
#
# PRECONDITION: commit the EB prompts on feat/n-rl-navigation first so the worktrees (branched off it)
# see them:  cellular-gaits: ops/prompts/PROMPT_eb_0a_brain.md, PROMPT_eb_0c_body.md (+ 0b, 1 for later).
# (EB-0B and EB-1 are SEQUENTIAL and not staged here — run them after merging wave 1; see the plan.)

set -euo pipefail

CELLGAITS="$HOME/dev/jarvis/cellular-gaits"
# Base off feat/n-rl-navigation: it carries the ops/ layout, the env, and the escape script, and the
# EB prompts get committed there. (EB-0B re-resolves the LC4/LPLC2/DNp01 IDs itself, so CX-1 — which
# lives on feat/cx-connectome — isn't required on the base.) Consolidate branches to main later.
BASE_BRANCH="feat/n-rl-navigation"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
git -C "$CELLGAITS" rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1 \
  || { echo "ERROR: branch $BASE_BRANCH missing in $CELLGAITS."; exit 1; }

# open a Mac Terminal tab in a fresh worktree off $BASE_BRANCH, paste the directive unsubmitted
open_worktree_session () {
  local name="$1" branch="$2" prompt="$3" directive="$4"
  local wt="$HOME/dev/jarvis/cg-eb-$name"
  if [ ! -d "$wt" ]; then
    git -C "$CELLGAITS" worktree add "$wt" -b "$branch" "$BASE_BRANCH" \
      || git -C "$CELLGAITS" worktree add "$wt" "$branch"
  else
    echo "  worktree $wt exists — reusing"
  fi
  [ -f "$wt/$prompt" ] || { echo "ERROR: $prompt not on $BASE_BRANCH — commit the EB prompts on main first."; exit 1; }
  osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$wt' && uv sync && claude --permission-mode bypassPermissions" in front window
end tell
OSA
  sleep 4
  osascript <<OSA
set the clipboard to "$directive"
tell application "Terminal" to activate
delay 0.3
tell application "System Events" to keystroke "v" using command down
OSA
  echo "  staged $name in $wt (branch $branch)"
}

open_worktree_session "brain" "feat/eb-brain" "ops/prompts/PROMPT_eb_0a_brain.md" \
  "Read ./ops/prompts/PROMPT_eb_0a_brain.md and implement it EXACTLY on branch feat/eb-brain. Use a todo list. Vendor the Shiu LIF brain, get Brian2 running on this Mac, expose the BrainModel API, reproduce a known result, and write the brain explainer note. Gitignore the heavy parquet. Commit on your branch when done; do not merge. STOP and report. Do not begin until I confirm."

open_worktree_session "body" "feat/eb-body" "ops/prompts/PROMPT_eb_0c_body.md" \
  "Read ./ops/prompts/PROMPT_eb_0c_body.md and implement it EXACTLY on branch feat/eb-body. Use a todo list. Build the body-side escape motor primitive by REUSING the existing trained escape behavior (no new RL training), validate it in a short MuJoCo rollout, and write the body explainer note. Commit on your branch; do not merge. STOP and report. Do not begin until I confirm."

cat <<DONE

--------------------------------------------------------------------------------
EB wave 1 staged — TWO parallel Mac sessions (no sentry):
  - brain (feat/eb-brain, worktree ~/dev/jarvis/cg-eb-brain) — EB-0A
  - body  (feat/eb-body,  worktree ~/dev/jarvis/cg-eb-body)  — EB-0C
Directives PASTED, not submitted — review each and press Return.

When both report + you've reviewed: merge into main, prune the worktrees, then run the SEQUENTIAL steps:
  EB-0B (ops/prompts/PROMPT_eb_0b_neurons.md, needs the brain) → EB-1 (ops/prompts/PROMPT_eb_1_coupling.md).
Cleanup when done:  cd $CELLGAITS && git worktree remove ~/dev/jarvis/cg-eb-brain ; git worktree remove ~/dev/jarvis/cg-eb-body
--------------------------------------------------------------------------------
DONE
