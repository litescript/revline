#!/usr/bin/env bash
# === Revline Git Sync Utility ===
# Run from the repo root.
# Keeps dev and main up-to-date, merges cleanly, and avoids leaking .env files.

set -e

echo "→ Checking branch..."
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "dev" ]; then
  echo "Switching to dev..."
  git switch dev
fi

echo "→ Updating .gitignore to protect local envs..."
grep -qxF '.env' .gitignore || echo -e '\n.env' >> .gitignore
git rm --cached .env 2>/dev/null || true

echo "→ Staging & committing all changes..."
git add -A
git reset .env || true
git commit -m "Dev: sync + cleanup before merge" || echo "Nothing to commit."

echo "→ Pulling remote dev (rebase)..."
git pull --rebase origin dev
echo "→ Pushing dev branch..."
git push origin dev

echo "→ Switching to main..."
git switch main
git pull --rebase origin main

echo "→ Merging dev → main..."
git merge --no-ff dev -m "Merge dev → main (sync & deployable stack)"
git push origin main

echo "→ Returning to dev..."
git switch dev

echo "✅ All synced: dev + main updated and pushed."
