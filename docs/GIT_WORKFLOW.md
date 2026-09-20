# Git Workflow

## Branches

[GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow): `main`
is always deployable and is never committed to directly. Every change —
including a one-line doc fix — starts as a branch off the current `main`.

```bash
git checkout main && git pull
git checkout -b feat/frontend-dashboard
```

**Naming:** `<type>/<short-kebab-description>`, reusing the commit types below
(`feat/`, `fix/`, `refactor/`, `docs/`, `chore/`…). Describe the outcome, not
the mechanism — `feat/monthly-summary`, not `feat/add-groupby-query`. In this
monorepo a leading app name is fine when the same feature could land on either
side (`feat/frontend-dashboard`).

**One branch, one concern.** Short-lived is the point: a branch that outlives a
few days has stopped being a unit of review. If a second, unrelated fix suggests
itself mid-branch, branch again from `main` rather than smuggling it in — that
is what keeps a PR reviewable and a revert surgical.

**Merging** goes through a PR — see _Pull requests_ below. Force-pushing your
own unmerged feature branch is fine; force-pushing `main` or a branch someone
else has checked out is not.

## Pull requests

The remote is [`Kowloonoriginal/expense-tracker`](https://github.com/Kowloonoriginal/expense-tracker);
open PRs with `gh`, never by pushing to `main`.

```bash
git push -u origin feat/monthly-summary
gh pr create --base main --title "feat(transactions): add monthly summary" --body-file <file>
```

**Title** is a Conventional Commit header, same rules as a commit subject:
`<type>(<scope>): <subject>`, imperative, lowercase, ≤72 chars. The title is
what lands in history on a squash merge, so it has to stand on its own.

**Before writing the body, read the diff** — `git diff main...HEAD` (three dots:
the branch's own changes, not `main`'s) plus `--stat` for the shape of it. The
description is written from the diff, not from memory of the task.

**Body** covers, in this order, skipping what does not apply:

1. **Що реалізовано** — the user-visible outcome and the _why_; the mechanism is
   already in the diff.
2. **Ендпоінти** — every route added or changed, as `METHOD /path` with its DTO
   from `@repo/shared` and whether it is `@Public()` or behind `JwtAuthGuard`.
   Say "нових ендпоінтів немає" explicitly when there are none — a reviewer
   should not have to infer it from silence.
3. **Схема / міграції** — new Prisma models or migrations, and whether the
   migration is destructive.
4. **Файли** — a short table of touched files and what changed in each, for a
   diff small enough that a table beats scrolling.
5. **Як перевірити** — the exact commands and the route to open.
6. **Ризики / поза скоупом** — what was deliberately left out, and anything a
   reviewer should watch for.

Breaking changes get the same `BREAKING CHANGE:` note as the commit, with the
migration path spelled out. PR descriptions Claude Code writes end with the
`🤖 Generated with [Claude Code](https://claude.com/claude-code)` line.

**Merging:** squash when the branch carries WIP noise, merge as-is when every
commit stands on its own. Rebase onto `main` before merging so history stays
linear, and delete the branch afterwards.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`

```
feat(transactions): add income/expense module with monthly summary

The FK proves a category exists but not who owns it, so create/update
verify ownership over the bus via GetCategoryByIdQuery.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`,
`ci`, `chore`, `revert`.

**Scope** is the module or slice the change lives in, not the workspace:
`auth`, `users`, `categories`, `transactions`, `security`, `prisma` on the
backend; `login`, `register`, `session`, `header`, `ui` on the frontend;
`shared` for `packages/shared`; `deps` for dependency bumps. Omit it when a
change genuinely spans the repo (`chore: bump node to 22`).

**Subject:** imperative mood, lowercase, no trailing period, header ≤72 chars
("add monthly summary", not "Added monthly summary."). The body explains _why_ —
the mechanism is already in the diff. Wrap it at 72 columns.

**Breaking changes** get a `!` after the scope and a `BREAKING CHANGE:` footer
explaining the migration path: `feat(shared)!: make Transaction.amount a string`.

One logical change per commit. A schema change and the module that uses it
belong together (they don't build separately); an unrelated formatting sweep
does not. Commits Claude Code authors end with the `Co-Authored-By` trailer.
