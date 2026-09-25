#!/bin/bash
# Pre-flight for commit-to-branch. Runs before the skill starts; its output
# lands in the skill's context. It never blocks by exit code — it prints a
# verdict line and the skill decides what to do with it.

CURRENT=$(git branch --show-current)
echo "Branch: ${CURRENT:-<detached HEAD>}"

if [ -z "$CURRENT" ]; then
  echo "STOP: detached HEAD — check out a branch before committing."
  exit 0
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "STOP: nothing to commit — the working tree is clean."
  exit 0
fi

# Anything that looks like a secret must never be staged.
SECRETS=$(git status --porcelain | awk '{print $NF}' \
  | grep -E '(^|/)\.env($|\.)|\.pem$|\.key$|id_rsa' | grep -v '\.example$')
if [ -n "$SECRETS" ]; then
  echo "WARN: possible secrets in the changes, do not stage them:"
  echo "$SECRETS" | sed 's/^/  - /'
fi

if [ "$CURRENT" = "main" ]; then
  echo "NEW BRANCH: on main — create a feature branch before committing."
else
  AHEAD=$(git rev-list --count main..HEAD 2>/dev/null || echo 0)
  echo "OK: feature branch, $AHEAD commit(s) ahead of main."
fi
exit 0
