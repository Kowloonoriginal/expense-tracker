# Commit rules — reference

Detailed rules from `CLAUDE.md` and `docs/GIT_WORKFLOW.md`. Read the
section you need; `SKILL.md` only links here.

## Branches

`main` is always deployable and is **never committed to directly** —
every change starts as a branch off the current `main`, including a
one-line doc fix.

```bash
git checkout main && git pull
git checkout -b <type>/<short-kebab-description>
```

If there are uncommitted changes, `git stash -u` before switching and
`git stash pop` on the new branch.

**Naming:** `<type>/<short-kebab-description>`, reusing the commit types
below. Describe the **outcome**, not the mechanism — `feat/monthly-summary`,
not `feat/add-groupby-query`. A leading app name is fine when the same
feature could land on either side (`feat/frontend-dashboard`).

**One branch, one concern.** If the change is unrelated to the current
feature branch, branch again from `main` rather than smuggling it in.

Force-pushing your own unmerged feature branch is fine; force-pushing
`main` or a branch someone else has checked out is not.

## Header: `<type>(<scope>): <subject>`

**Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`,
`build`, `ci`, `chore`, `revert`.

**Scope** is the module or slice the change lives in, not the workspace:

- Backend: `auth`, `users`, `categories`, `transactions`, `security`, `prisma`
- Frontend: `login`, `register`, `session`, `header`, `ui`
- `shared` for `packages/shared`, `deps` for dependency bumps,
  `skills` for `.claude/skills`
- Omit the scope when a change genuinely spans the repo
  (`chore: bump node to 22`)

**Subject:** imperative mood, lowercase, no trailing period, header
≤72 chars ("add monthly summary", not "Added monthly summary.").

## Body

Explains **why** — the mechanism is already in the diff. Wrap at 72
columns. Shape: `template.md`; quality bar: `examples/good-commit.md`.

## Breaking changes

A `!` after the scope and a `BREAKING CHANGE:` footer explaining the
migration path: `feat(shared)!: make Transaction.amount a string`.

## One logical change per commit

A schema change and the module that uses it belong together (they don't
build separately); an unrelated formatting sweep does not.

## Pre-commit hook failures

The commit did not happen. Fix the issue, re-stage, and create a **new**
commit — never `--amend` (it would rewrite the *previous* commit) and
never `--no-verify` unless the user explicitly asks.
