---
name: claude-md-import-trailing-period
description: "CLAUDE.md @path imports break silently when a sentence's full stop touches the path"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 07ddde3a-cc29-4a2e-98dd-a540bc7e299c
  modified: 2026-09-20T08:44:41.106Z
---

A `@path/to/file.md` import in CLAUDE.md fails silently when the sentence's
period sits directly against the path: the parser reads `@docs/ARCHITECTURE.md.`
as the filename, finds nothing, and drops the import with no error. Put a word
after the path (`@docs/ARCHITECTURE.md file — …`) or restructure the sentence.

Verified 2026-09-20 on Claude Code 2.1.236 with an isolated sandbox:
`See @docs/SECRET.md for the number` loaded, `live in @docs/SECRET.md.` did not,
`live in @docs/SECRET.md file.` loaded.

**Why:** the failure is invisible — the referenced text simply never reaches the
context, so a split-up CLAUDE.md looks fine while silently having hidden half
its content.

**How to apply:** after writing or editing any `@` import, verify it rather than
assuming — run `claude -p "<question only the imported file answers>"
--disallowedTools "*"` in the project directory and check the answer comes back.
