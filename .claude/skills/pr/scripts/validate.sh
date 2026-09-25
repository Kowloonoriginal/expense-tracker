#!/bin/bash
# Pre-flight for /pr. Runs before the skill starts; its output lands in the
# skill's context. Exit 2 plus a STOP line means "do not open a PR".

CURRENT=$(git branch --show-current)
if [ "$CURRENT" = "main" ]; then
  echo "STOP: cannot open a PR from main. Create a feature branch first."
  exit 2
fi

git fetch -q origin main 2>/dev/null
COMMITS=$(git rev-list --count origin/main..HEAD 2>/dev/null || git rev-list --count main..HEAD)
if [ "$COMMITS" -eq 0 ]; then
  echo "STOP: branch $CURRENT has no commits ahead of main."
  exit 2
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "WARN: uncommitted changes — they will not be in the PR."
fi

EXISTING=$(gh pr view "$CURRENT" --json url -q .url 2>/dev/null)
if [ -n "$EXISTING" ]; then
  echo "EXISTS: a PR for $CURRENT is already open: $EXISTING"
fi

echo "OK: $CURRENT is $COMMITS commit(s) ahead of main."
exit 0
