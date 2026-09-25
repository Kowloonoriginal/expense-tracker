---
name: standup
description: Summarize the work done in the last 24 hours (commits across all local branches, plus current uncommitted work) into a clean, copy-pasteable standup update for the team lead. Use when the user asks for a "standup", "звіт", "стендап", "що я зробив за день", "summary of work for today/yesterday", or wants to report progress to their tech lead.
model: sonnet
---

# Standup

Builds a short, human-readable summary of everything done in this repo over
the last 24 hours — commits (own and, where relevant, the whole branch), and
any work still in progress — formatted so the user can paste it straight into
Slack/chat for their tech lead.

## 1. Gather commits from the last 24 hours

Use the git identity from `git config user.email` (fall back to
`user.name`) to filter to the user's own work, across **all** branches, not
just the current one:

```bash
git log --all --since="24 hours ago" --author="$(git config user.email)" \
  --pretty=format:'%h|%ad|%an|%s|%D' --date=format:'%Y-%m-%d %H:%M'
```

If that yields nothing (e.g. commit author is a display name, not the
email), retry without `--author` and filter by `git config user.name`, or
just show `--all --since="24 hours ago"` and note in the summary that it
includes the whole team's commits (ask the user if unsure whose work to
include).

For each commit worth mentioning, get the body/why (not just the subject),
since PR-quality commit bodies in this repo explain the *why*:

```bash
git log -1 --pretty=format:'%B' <hash>
```

Also check which branch(es)/PRs each commit belongs to — `%D` in the format
above gives ref names; cross-reference with `gh pr list --state all --search
"<branch>"` if the user wants PR links included.

## 2. Gather uncommitted / in-progress work

Don't limit the standup to finished commits — include what's currently
in flight:

```bash
git status --short
git branch --show-current
```

If there's a meaningful uncommitted diff, summarize it in one line (what
it's for), not a line-by-line dump.

## 3. Check for open PRs from the last 24h

```bash
gh pr list --author "@me" --state all --search "created:>=$(date -v-24H +%Y-%m-%d)" --json number,title,url,state
```

(On Linux/no `-v` support for `date`, compute the ISO date any available
way — e.g. `date -d '24 hours ago' +%Y-%m-%d`.)

Include PR links in the summary when available — the team lead will likely
want to click through.

## 4. Format the summary

Group by branch/feature, not by raw commit order. Write in the same
language the user asked in (default Ukrainian, since that's how this repo's
docs and this user communicate). Structure:

```
📋 Звіт за [дата/період]

**[гілка/фіча 1]**
- що зроблено (коротко, суть, а не механіка) — посилання на PR, якщо є
- ...

**[гілка/фіча 2]**
- ...

**В процесі:**
- що зараз не закомічено / над чим ще працюю

**Далі:**
- (тільки якщо користувач попросив, або є очевидний наступний крок з контексту)
```

Rules:
- One bullet per logical change, written for a non-technical-detail skim —
  outcome first ("додав місячний звіт по транзакціях"), not implementation
  ("changed GroupBy query in repository").
- Skip `chore`/`docs`/formatting-only commits unless nothing else happened
  that day — the lead cares about features/fixes, not the noise.
- Keep it scannable: short bullets, no walls of text, no code blocks.
- Don't invent work that isn't in the log — if the last 24h is empty, say
  so plainly rather than padding it out.

## 5. Deliver

Print the final summary as plain chat text (not a file) so the user can
copy it directly into Slack/Telegram/etc. Only write it to a file or
artifact if the user explicitly asks for one.

## Out of scope

- Opening PRs or commits — this skill only reports on existing work. Use
  `commit-to-branch` / `commit-push-pr` for that.
- Time tracking or estimates — only report what happened, not how long
  it took, unless the user supplies that themselves.
