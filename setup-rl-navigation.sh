#!/usr/bin/env bash
#
# setup-rl-navigation.sh — stage the N-RL build (navigation via PPO + domain randomization,
# built as the reusable connectome RL harness). Mirrors setup-navigation-wave1 / setup-escape-wave2.
#
#   wave1  THREE PARALLEL sessions in cellular-gaits, each in its own git WORKTREE:
#            1a env     feat/n-rl-env      rl/env_base.py + rl/nav_env.py + gymnasium dep   (Gate 1)
#            1b policy  feat/n-rl-policy   rl/policies.py (NCA as PPO Gaussian policy)       (A/B gate)
#            1c ppo     feat/n-rl-ppo      rl/ppo.py (policy-/env-agnostic PPO loop)         (loop gate)
#   wave2  ONE session in cellular-gaits on feat/n-rl-navigation (AFTER you merge the three):
#            2  integrate scripts/run_rl_navigation.py + 4-gate calibration → REPORT, then STOP
#
#   ./setup-rl-navigation.sh wave1     # stage the three parallel worktree sessions
#   ./setup-rl-navigation.sh wave2     # stage the integrate session (after merging wave-1 branches)
#
# These run ON THE MAC (where `claude` lives), exactly like the N-A build. Only the eventual FULL
# PPO run is dispatched to sentry (a plain `uv run` job — no `claude` needed on the box).
#
# Opens a Terminal tab per session, cd's in, runs setup, launches claude, and PASTES the directive
# WITHOUT pressing Return (you review, then hit Return). macOS + Terminal.app; grant Terminal
# Accessibility for the auto-paste. If paste misfires, each worktree has its PROMPT_*.md — paste by
# hand. bypassPermissions: review before Return.
#
# PREREQ for wave1: the four chunk prompts must be COMMITTED on feat/n-rl-navigation (worktrees check
# out that branch, so uncommitted files in your main tree won't appear in them). Commit them first.

set -euo pipefail

CELLGAITS="$HOME/dev/jarvis/cellular-gaits"
WAVE="${1:-}"
BASE_BRANCH="feat/n-rl-navigation"

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

# stage one parallel session in a fresh worktree off $BASE_BRANCH
open_worktree_session () {
  local name="$1" branch="$2" prompt="$3"
  local wt="$HOME/dev/jarvis/cg-rl-$name"
  if [ ! -d "$wt" ]; then
    git -C "$CELLGAITS" worktree add "$wt" -b "$branch" "$BASE_BRANCH" \
      || git -C "$CELLGAITS" worktree add "$wt" "$branch"
  fi
  [ -f "$wt/$prompt" ] || { echo "ERROR: $prompt not on $BASE_BRANCH (commit the chunk prompts first)."; exit 1; }
  open_session "$wt" "uv sync" \
    "Read ./$prompt and implement it EXACTLY on branch $branch. Use a todo list. Code to the contract in the prompt; commit on your branch when your gate passes; do not merge. Do not begin until I confirm."
}

case "$WAVE" in
  wave1)
    git -C "$CELLGAITS" rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1 \
      || { echo "ERROR: branch $BASE_BRANCH missing. Create it and commit the four PROMPT_n_rl_*.md onto it first."; exit 1; }
    open_worktree_session "env"    "feat/n-rl-env"    "PROMPT_n_rl_1a_env.md"
    open_worktree_session "policy" "feat/n-rl-policy" "PROMPT_n_rl_1b_policy.md"
    open_worktree_session "ppo"    "feat/n-rl-ppo"    "PROMPT_n_rl_1c_ppo.md"
    cat <<DONE

Three worktree tabs staged (env / policy / ppo). Each directive is PASTED, not submitted — review and
press Return to start. Worktrees: ~/dev/jarvis/cg-rl-{env,policy,ppo}.

Each session runs its own gate and commits on its branch. When all three are green, merge them into
$BASE_BRANCH and clean up the worktrees:
  cd $CELLGAITS
  git checkout $BASE_BRANCH
  git merge feat/n-rl-env feat/n-rl-policy feat/n-rl-ppo      # resolve any rl/__init__.py overlap
  git worktree remove ~/dev/jarvis/cg-rl-env
  git worktree remove ~/dev/jarvis/cg-rl-policy
  git worktree remove ~/dev/jarvis/cg-rl-ppo
Then:  ./setup-rl-navigation.sh wave2
DONE
    ;;

  wave2)
    [ -f "$CELLGAITS/PROMPT_n_rl_2_integrate.md" ] || { echo "ERROR: PROMPT_n_rl_2_integrate.md missing on $BASE_BRANCH."; exit 1; }
    open_session "$CELLGAITS" \
      "git checkout $BASE_BRANCH && uv sync" \
      "Read ./PROMPT_n_rl_2_integrate.md and implement it EXACTLY on branch $BASE_BRANCH. Use a todo list. Wire env+policy+ppo, run the four-gate calibration, write REPORT_n_rl_calibration.md, then STOP — do NOT launch the full run. Commit on the branch. Do not begin until I confirm."
    cat <<DONE

Integrate tab staged (cellular-gaits, $BASE_BRANCH). Directive PASTED, not submitted — review and
press Return. It STOPS after the 4-gate calibration. Send me REPORT_n_rl_calibration.md and I'll
green-light the full run (dispatched to sentry as a uv job) or we course-correct.
DONE
    ;;

  *)
    echo "usage: ./setup-rl-navigation.sh [wave1|wave2]"; exit 1 ;;
esac
