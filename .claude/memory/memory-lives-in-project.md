---
name: memory-lives-in-project
description: "Memories for this repo are stored in .claude/memory/, never in the global per-project memory dir"
metadata:
  type: feedback
---

Every memory for this repo lives in `.claude/memory/` inside the project, with
`.claude/memory/MEMORY.md` as the index. The global directory
`~/.claude/projects/-Users-kostantin-…/memory/` holds no memories for this
project — only a one-line pointer back here.

The index is loaded by an `@.claude/memory/MEMORY.md` import in the root
`CLAUDE.md`, so write the import with a word after the path — see
[[claude-md-import-trailing-period]].

**Why:** `.claude/` is tracked in git here (only `settings.local.json` is
ignored), so memories kept in the project travel with the repo, show up in
review, and are shared with anyone who clones it — a global directory is
invisible to all of that.

**How to apply:** when saving a memory in this repo, write the file under
`.claude/memory/` and add its pointer line to `.claude/memory/MEMORY.md`. Since
these files are committed, keep them about the project — anything personal or
sensitive does not belong there.
