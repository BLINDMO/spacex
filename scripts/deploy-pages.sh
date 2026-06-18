#!/usr/bin/env bash
# Build the app and publish dist/ to the `gh-pages` branch, which GitHub Pages serves with
# its own builder (no hosted Actions runner required). Run from the repo root: `npm run deploy`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "› Building production bundle…"
npm run build

WT="$(mktemp -d)"
echo "› Staging gh-pages worktree at $WT"
git worktree remove --force "$WT" 2>/dev/null || true
git worktree add -B gh-pages "$WT" HEAD >/dev/null

cd "$WT"
git rm -rqf . >/dev/null 2>&1 || true
cp -r "$ROOT/dist/." .
touch .nojekyll
git add -A
git commit -qm "Deploy MISSION CONTROL build to GitHub Pages" || echo "(no changes)"

echo "› Pushing gh-pages…"
git push -f origin gh-pages

cd "$ROOT"
git worktree remove --force "$WT" >/dev/null 2>&1 || true
echo "✓ Deployed. Live at: https://<owner>.github.io/<repo>/"
