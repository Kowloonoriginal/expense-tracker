---
name: commit-to-branch
description: Create a feature branch off main (if not already on one) and make a Conventional Commits commit, following this repo's Git workflow. Use when the user asks to "commit", "закомить", "зроби коміт", "commit this" or "commit to a branch".
model: sonnet
allowed-tools: Bash(git *), Bash(bash *)
---

# Commit to branch

Gets a change onto a feature branch as one well-formed commit. It does
not push or open a PR — that is the `pr` skill.

## Context

Pre-flight: !`bash "${CLAUDE_SKILL_DIR}/scripts/validate.sh"`

Changes: !`git status --short`

Recent commits: !`git log --oneline -10`

## Algorithm

1. Read the pre-flight above:
   - `STOP:` — tell the user why and end here.
   - `WARN:` — never stage the listed files.
   - `NEW BRANCH:` — or the change is unrelated to the current branch:
     create a branch off `main` as in @reference.md § Branches.
2. Read the diff (`git diff`, `git diff --staged`) — the message is
   written from the diff, not from memory of the task.
3. Stage files **by name** — never `git add -A` / `git add .`.
4. Write the message from @template.md, using @examples/good-commit.md as
   the quality bar and @reference.md for types, scopes and subject rules.
   Pass it through a heredoc so the formatting survives:
   `git commit -F - <<'EOF' … EOF`.
5. `git status` to confirm the tree is clean; report the commit hash.

## Обмеження

- **Ніколи не коміть** `.env`, `.env.local`, файли з секретами.
- **Не пуш** — тільки коміт, якщо користувач не попросив інше.
- **Не використовуй** `--no-verify`, `--amend` без явного прохання.
- **Не додавай** файли, вміст яких не переглянув.
