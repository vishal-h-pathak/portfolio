#!/usr/bin/env bash
#
# setup-r3-waves.sh — stage the four PARALLEL Round-3 (WP3) content sessions.
#
# Four sessions on the portfolio, each in its OWN worktree + branch off feat/cg-redesign.
# The four WP3 prompts are file-disjoint, so parallel is safe — but four writers must NOT
# share one worktree (that was the WP1 clobber). Each tab: makes its worktree, symlinks
# node_modules from the cg-redesign worktree (so tsc works WITHOUT a 4x disk hit), launches
# claude, and PASTES its directive WITHOUT pressing Return (review, then Return to start).
#
#   - WP3a  feat/cg-r3a  Embodied + Escape (the connectome climax)
#   - WP3b  feat/cg-r3b  Controller + Mapping + Search & Objective
#   - WP3c  feat/cg-r3c  Sensing + Behaviors hub (loop diagrams)
#   - WP3d  feat/cg-r3d  Perturbation + Chemotaxis + Navigation
#
# Run from anywhere:  bash setup-r3-waves.sh
# Requirements: macOS + Terminal.app; Terminal Accessibility for auto-paste. bypassPermissions
# = review before Return. Integration commands (merge → validate → push) print at the end.
#
# NOTE (the Air): four concurrent claude sessions is the heaviest we've run. node_modules is
# symlinked (not copied) to keep disk flat, but if it gets sluggish, just don't press Return in
# two of the tabs until the first two finish — the prompts are independent, order doesn't matter.

set -euo pipefail

PORTFOLIO="$HOME/dev/jarvis/portfolio"
PROMPTS="$PORTFOLIO/ops/prompts"
CGWT="$HOME/dev/jarvis/portfolio-wt/cg-redesign"          # has real node_modules (symlink source)
WTROOT="$HOME/dev/jarvis/portfolio-wt"

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not on PATH."; exit 1; }
[ -d "$CGWT/node_modules" ] || { echo "ERROR: $CGWT/node_modules missing — run 'npm install' in the cg-redesign worktree first."; exit 1; }
for p in r3a_connectome r3b_methodology r3c_loops r3d_behaviors; do
  [ -f "$PROMPTS/PROMPT_cg_$p.md" ] || { echo "ERROR: missing prompt PROMPT_cg_$p.md"; exit 1; }
done

open_session () {
  local branch="$1" wt="$2" promptfile="$3" tasklabel="$4"
  osascript <<OSA
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$PORTFOLIO' && git worktree add -b '$branch' '$wt' feat/cg-redesign 2>/dev/null || true ; ln -sfn '$CGWT/node_modules' '$wt/node_modules' ; cd '$wt' && echo '── $tasklabel · $branch ──' && claude --permission-mode bypassPermissions" in front window
end tell
OSA
  sleep 6
  local directive="Read $promptfile and implement it exactly. OVERRIDE: the launcher has placed you on branch $branch in an isolated worktree for parallel safety — work and commit HERE, on $branch. Where the prompt says to work in the cg-redesign worktree or commit on feat/cg-redesign, ignore that: do NOT touch the shared cg-redesign worktree, do NOT merge, do NOT push (the four branches are merged into feat/cg-redesign together after all four land). Verify with 'npx tsc --noEmit' (node_modules is symlinked, so tsc works); do NOT run 'npm run dev' or 'next build' (the symlink breaks Turbopack) — the human does the visual localhost:3000 validation after merge. Do not begin until I confirm."
  osascript <<OSA
set the clipboard to "$directive"
tell application "Terminal" to activate
delay 0.3
tell application "System Events" to keystroke "v" using command down
OSA
}

open_session "feat/cg-r3a" "$WTROOT/r3a" "$PROMPTS/PROMPT_cg_r3a_connectome.md"  "WP3a Embodied+Escape"
open_session "feat/cg-r3b" "$WTROOT/r3b" "$PROMPTS/PROMPT_cg_r3b_methodology.md" "WP3b Controller+Mapping+Search"
open_session "feat/cg-r3c" "$WTROOT/r3c" "$PROMPTS/PROMPT_cg_r3c_loops.md"       "WP3c Sensing+Behaviors-hub"
open_session "feat/cg-r3d" "$WTROOT/r3d" "$PROMPTS/PROMPT_cg_r3d_behaviors.md"   "WP3d Perturbation+Chemo+Nav"

cat <<DONE

Four tabs staged (WP3a–d), each in its own worktree on its own branch, directive PASTED (not
submitted). Review each, press Return to start. bypassPermissions is on — review first.

When all four report done, integrate + ship (the branches are file-disjoint, so the merges are clean):

  cd $CGWT
  git merge feat/cg-r3a && git merge feat/cg-r3b && git merge feat/cg-r3c && git merge feat/cg-r3d
  npx tsc --noEmit
  npm run dev            # validate the changed pages on localhost:3000
  # once it looks right:
  git push origin feat/cg-redesign:main
  git fetch origin && git branch -f main origin/main
  # cleanup the worktrees:
  git worktree remove $WTROOT/r3a $WTROOT/r3b $WTROOT/r3c $WTROOT/r3d

You can also merge + validate + push them one at a time as each lands, if you'd rather ship
incrementally instead of all at once.
DONE
