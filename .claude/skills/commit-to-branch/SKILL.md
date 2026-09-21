---
name: commit-to-branch
description: Create a feature branch off main (if not already on one) and make a Conventional Commits commit, following this repo's Git workflow. Use when the user asks to "commit", "закомить", "зроби коміт", "commit this" or "commit to a branch".
model: sonnet
 
---

# Commit to branch

Repo-specific rules for branching and committing, extracted from
`CLAUDE.md` and `docs/GIT_WORKFLOW.md`. This skill only covers getting a
change onto a branch as a well-formed commit — it does not open a PR (use
the `commit-push-pr` skill / `gh pr create` for that).

## 1. Check current branch

`main` is always deployable and is **never committed to directly** — every
change starts as a branch off the current `main`, including a one-line doc
fix.

```bash
git branch --show-current
```

- If already on a non-`main` feature branch that matches the change in
  scope, commit there.
- If on `main` (or on a branch for an unrelated concern), create a new
  branch first:

```bash
git checkout main && git pull
git checkout -b <type>/<short-kebab-description>
```

**Branch naming:** `<type>/<short-kebab-description>`, reusing the commit
types below (`feat/`, `fix/`, `refactor/`, `docs/`, `chore/`…). Describe the
**outcome**, not the mechanism — `feat/monthly-summary`, not
`feat/add-groupby-query`. A leading app name is fine when the same feature
could land on either side of the monorepo (`feat/frontend-dashboard`).

**One branch, one concern.** If a second, unrelated fix suggests itself
mid-branch, branch again from `main` rather than smuggling it in.

Force-pushing your own unmerged feature branch is fine; force-pushing
`main` or a branch someone else has checked out is not.

## 2. Write the commit

[Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<scope>): <subject>`

```
feat(transactions): add income/expense module with monthly summary

The FK proves a category exists but not who owns it, so create/update
verify ownership over the bus via GetCategoryByIdQuery.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`,
`build`, `ci`, `chore`, `revert`.

**Scope** is the module or slice the change lives in, not the workspace:
- Backend: `auth`, `users`, `categories`, `transactions`, `security`, `prisma`
- Frontend: `login`, `register`, `session`, `header`, `ui`
- `shared` for `packages/shared`
- `deps` for dependency bumps
- Omit the scope when a change genuinely spans the repo (`chore: bump node to 22`)

**Subject:** imperative mood, lowercase, no trailing period, header ≤72
chars ("add monthly summary", not "Added monthly summary."). The body
explains **why** — the mechanism is already in the diff. Wrap the body at
72 columns.

**Breaking changes** get a `!` after the scope and a `BREAKING CHANGE:`
footer explaining the migration path:
`feat(shared)!: make Transaction.amount a string`.

**One logical change per commit.** A schema change and the module that
uses it belong together (they don't build separately); an unrelated
formatting sweep does not.

**Attribution:** commits authored here end with:
```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```
(Follow whatever attribution line the current session's system reminder
specifies if it differs from this — that instruction takes precedence.)

## 3. Steps

1. `git status` — review what changed; never blindly `git add -A`.
2. `git diff` (staged + unstaged) to understand the change and draft the
   message from it.
3. `git log --oneline -10` to match this repo's message style.
4. Confirm/create the branch per step 1 above.
5. Stage the relevant files by name (not `-A`/`.`), watching for secrets in
   anything unexpected.
6. Commit with a heredoc so formatting survives:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body explaining why, wrapped at 72 cols>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

7. `git status` to confirm a clean tree after the commit.
8. If a pre-commit hook fails: fix the issue, re-stage, and create a **new**
   commit — never `--amend` after a hook failure (the commit didn't
   happen, so amend would touch the *previous* commit) and never skip
   hooks with `--no-verify` unless the user explicitly asks.

## Важливі обмеження

- **Ніколи не коміть** `.env`, `.env.local`, файли з секретами.
- **Не пуш** автоматично — тільки коміт, якщо користувач не попросив інше.
- **Не використовуй** `--no-verify`, `--amend` без явного прохання користувача.
- **Не додавай** файли без явного розуміння їхнього вмісту.

## Out of scope

- Opening a PR (title/body structure, squash-vs-merge, rebase-before-merge)
  — see `docs/GIT_WORKFLOW.md` § Pull requests, or the `commit-push-pr` skill.
- Pushing to remote — only do this if the user asks.
