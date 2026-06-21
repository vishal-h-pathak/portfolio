#!/usr/bin/env bash
#
# push-cross-machine.sh — run on the MAC. Pushes everything the Windows box needs to (a) load
# the cross-machine system and (b) start the navigation full evolution tonight.
#
# Safe by design: explicit `git add <files>` only (never `add -A`), commits are skipped if there's
# nothing staged (idempotent — safe to re-run), and it does NOT switch branches, so it can't
# disturb in-flight feature work. It commits the infra onto the CURRENT branch of each repo and
# pushes; those docs flow to main on the next ship.
#
# What it pushes:
#   cellular-gaits @ feat/n-navigation         <- nav compute code (NOT yet on GitHub) + CLAUDE.md
#                                                 + wandb prompt + tracked uv.lock
#   portfolio      @ feat/n-navigation-scaffold <- SYNC.md + CROSS_MACHINE.md + CLAUDE.md rules
#
# After it runs, follow the printed Windows quickstart to start the run before bed.

set -euo pipefail

CELLGAITS="$HOME/dev/jarvis/cellular-gaits"
PORTFOLIO="$HOME/dev/jarvis/portfolio"

commit_if_staged () {  # $1 = message
  if git diff --cached --quiet; then
    echo "   (nothing new to commit — already done)"
  else
    git commit -m "$1"
  fi
}

echo "=================================================================="
echo " 1/2  cellular-gaits  (branch: feat/n-navigation)"
echo "=================================================================="
cd "$CELLGAITS"
rm -f .git/index.lock
git rev-parse --abbrev-ref HEAD | grep -qx "feat/n-navigation" \
  || { echo "!! cellular-gaits is not on feat/n-navigation. Aborting so nothing is mis-pushed."; exit 1; }
git add CLAUDE.md WINDOWS_SETUP.md PROMPT_wandb_integration.md .gitignore uv.lock
commit_if_staged "cross-machine: cellular-gaits CLAUDE.md + WINDOWS_SETUP.md + wandb prompt + track uv.lock"
echo "-- pushing feat/n-navigation (the nav code + infra) --"
git push -u origin feat/n-navigation
echo
git --no-pager log --oneline -3

echo
echo "=================================================================="
echo " 2/2  portfolio  (branch: feat/n-navigation-scaffold)"
echo "=================================================================="
cd "$PORTFOLIO"
rm -f .git/index.lock
git rev-parse --abbrev-ref HEAD | grep -qx "feat/n-navigation-scaffold" \
  || { echo "!! portfolio is not on feat/n-navigation-scaffold. Aborting."; exit 1; }
git add CLAUDE.md docs/cellular-gaits/CROSS_MACHINE.md docs/cellular-gaits/SYNC.md cockpit.sh push-cross-machine.sh
commit_if_staged "cross-machine: SYNC.md + CROSS_MACHINE.md + cockpit.sh + CLAUDE.md rules"
echo "-- pushing feat/n-navigation-scaffold --"
git push -u origin feat/n-navigation-scaffold
echo
git --no-pager log --oneline -3

cat <<'WINDOWS'

==================================================================
 DONE on the Mac. Now on WINDOWS (native Claude Code CLI):
==================================================================

# 0) one-time, if not already: install Claude Code CLI + Git for Windows
#    PowerShell:  irm https://claude.ai/install.ps1 | iex

# 1) clone both repos side by side (e.g. in %USERPROFILE%\dev\jarvis\)
git clone https://github.com/vishal-h-pathak/cellular-gaits.git
git clone https://github.com/vishal-h-pathak/portfolio.git

# 2) check out the branches with the work
cd cellular-gaits && git checkout feat/n-navigation && cd ..
cd portfolio      && git checkout feat/n-navigation-scaffold && cd ..   # so you can read SYNC.md

# 3) bridge the chemo warm-start file (gitignored in cellular-gaits; committed in portfolio)
mkdir -p cellular-gaits/outputs/web_data_ch
cp portfolio/public/cellular-gaits/data-ch/chemotaxis_controller.json cellular-gaits/outputs/web_data_ch/
#    (PowerShell instead of cp:  Copy-Item portfolio\public\cellular-gaits\data-ch\chemotaxis_controller.json cellular-gaits\outputs\web_data_ch\)

# 4) env + START THE RUN (this is the line in SYNC.md):
cd cellular-gaits
uv sync
uv run python scripts/run_evolution_navigation.py --pop 48 --gens 70 --checkpoint-every 5 --workers 16

# 5) go to sleep. In the morning: export the bundle + REPORT_n_a.md, commit on feat/n-navigation,
#    push, and update ../portfolio/docs/cellular-gaits/SYNC.md (clear the claim, log the result).
==================================================================
WINDOWS
