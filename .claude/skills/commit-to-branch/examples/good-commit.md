# Good commits from this repo

Use these as the quality bar: a header that stands on its own, and a
body that explains *why*, not *what*.

## Feature with a non-obvious decision

```
feat(transactions): add income/expense module with monthly summary

The FK proves a category exists but not who owns it, so create/update
verify ownership over the bus via GetCategoryByIdQuery.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Why it is good: one sentence in the body saves a reviewer from asking
"why not just rely on the foreign key?".

## Cross-cutting UI change

```
feat(ui): redesign app in dark navy theme with lime accent

Brings the UI in line with the chosen reference: a deep navy ground,
graphite cards, a single lime signal colour, pill-shaped navigation and
controls, and Manrope in place of Geist.

The `.paper` class re-declares the theme tokens, so any block can flip
to the light palette without per-component colour overrides. Income
amounts move from a hardcoded emerald class to a `text-income` token,
which the frontend conventions require.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Why it is good: the second paragraph records the mechanism a future
change would need to know about (`.paper`), and cites the rule that
motivated the token swap.

## Bad — do not write these

```
Updated files.                       # no type, past tense, says nothing
feat: Added new Stuff to frontend.   # capitalised, trailing period, vague
fix(backend): fix                    # scope is a workspace, not a module
```
