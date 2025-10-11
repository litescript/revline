#!/usr/bin/env bash
# === Revline Git Sync Utility ===
# Safely updates dev, merges to main, pushes both.
# - Ignores .env (kept local)
# - Auto-stashes dirty changes and restores them

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "Not inside a git repo."; exit 1
fi
cd "$repo_root"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
stash_ref=""
stashed="0"

restore_stash() {
  if [[ "$stashed" == "1" && -n "$stash_ref" ]]; then
    echo "→ Restoring your local changes from stash..."
    git stash pop "$stash_ref" || {
      echo "NOTE: stash pop had conflicts; resolve and commit when ready."
    }
  fi
}

trap restore_stash EXIT

echo "→ Ensuring .env stays local..."
if ! grep -qxF '.env' .gitignore; then
  echo '.env' >> .gitignore
fi
git rm --cached .env 2>/dev/null || true

# Stage everything except .env
git add -A
git reset .env || true
git commit -m "Dev: sync + cleanup before merge" || echo "→ Nothing new to commit."

# …keep the top of your script as-is…

# If tree is dirty (e.g. untracked or unstaged files), stash them and record the ref
if [[ -n "$(git status --porcelain)" ]]; then
  echo "→ Working tree dirty; auto-stashing local changes..."
  before_count=$(git stash list | wc -l | tr -d ' ')
  git stash push -u -m "revpush-autostash $(date +%F\ %T)" >/dev/null
  after_count=$(git stash list | wc -l | tr -d ' ')
  if [[ "$after_count" -gt "$before_count" ]]; then
    stash_ref=$(git stash list | head -1 | cut -d: -f1)   # e.g. "stash@{0}"
    stashed="1"
  else
    stashed="0"
    stash_ref=""
  fi
fi

restore_stash() {
  if [[ "$stashed" == "1" && -n "$stash_ref" ]]; then
    echo "→ Restoring your local changes from stash $stash_ref..."
    git stash pop "$stash_ref" || {
      echo "NOTE: stash pop had conflicts; resolve and commit when ready."
    }
  fi
}

echo "→ Switching to dev..."
git switch dev >/dev/null 2>&1 || git checkout -q dev

echo "→ Rebase & push dev..."
git pull --rebase --autostash origin dev
git push origin dev

echo "→ Switching to main..."
git switch main >/dev/null 2>&1 || git checkout -q main

echo "→ Rebase main, merge dev → main, push..."
git pull --rebase --autostash origin main
git merge --no-ff dev -m "Merge dev → main (sync & deployable stack)"
git push origin main

echo "→ Returning to dev..."
git switch dev >/dev/null 2>&1 || git checkout -q dev

echo "✅ All synced: dev + main updated and pushed."
