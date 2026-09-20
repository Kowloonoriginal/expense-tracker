# REVIEW.md

Rules for code review in this repository — for humans and for Claude Code
(`/code-review`, and the `claude-code-review.yml` workflow that runs it on every
PR). `CLAUDE.md` says how the code is written; this file says what a reviewer
checks before it lands on `main`.

## Чекліст рев'юера (перевіряти завжди)

- [ ] Назва PR відповідає Conventional Commits (`<type>(<scope>): <subject>`,
      imperative, lowercase, ≤72 символи)
- [ ] `npm run build`, `npm run lint`, `npm run format:check` проходять без
      помилок
- [ ] Шари FSD не порушені — імпорт іде лише вниз
      (`app → widgets → features → entities → shared`), без прямих імпортів у
      чужий `ui/`/`model/`/`api/`
- [ ] Межі CQRS-модулів дотримані — інший модуль викликається лише через
      `contracts/` (команду/запит на шину), не напряму через його
      сервіс/репозиторій
- [ ] Немає витоку даних чужого користувача — кожен хендлер, що приймає id від
      клієнта, звіряє його з `userId` з токена (ownership-перевірка)
- [ ] Усі вхідні дані валідуються через DTO з `class-validator`-декораторами
      (недекорований `whitelist: true` мовчки відкидає поле)

Це мінімум, з якого починається будь-яке ревʼю; розділи нижче — де кожен пункт
розкритий і чому.

## Стиль і найменування

Файли — kebab-case з типом у назві, класи всередині — PascalCase, за зразком
уже наявних модулів (`transactions/`, `categories/`):

- Контролери: `transactions.controller.ts` → `TransactionsController`
- Команди CQRS: `create-transaction.command.ts` → `CreateTransactionCommand`,
  `update-transaction.command.ts` → `UpdateTransactionCommand`
- Запити CQRS: `get-transactions.query.ts` → `GetTransactionsQuery`,
  `get-transaction-by-id.query.ts` → `GetTransactionByIdQuery`
- Хендлери: `<command-or-query-name>.handler.ts`, один хендлер на файл
  (`@CommandHandler`/`@QueryHandler` на класі, не кілька в одному файлі)
- DTO: `create-transaction.dto.ts` → `CreateTransactionDto`,
  `update-transaction.dto.ts` → `UpdateTransactionDto`
- Контракти-моделі: `<entity>.read-model.ts` → `<Entity>ReadModel`
- Frontend-слайси: `index.ts`-барель на слайс, файли всередині за роллю
  (`api/`, `model/`, `ui/`) — не за типом компонента

Розбіжність із цим — **Nit**, якщо не ламає межі шарів/модулів вище; якщо
ламає (наприклад, хендлер без `@CommandHandler`, що робить його "мертвим" для
шини) — **Blocker**.

## Що пропускати під час рев'ю

Не рев'ювати й не коментувати:

- `apps/backend/prisma/migrations/**` — генеровані Prisma, рев'юється факт їх
  наявності й деструктивність (див. _Data and contracts_ нижче), не вміст
  SQL-файлу
- `package-lock.json` та інші lock-файли
- `*.log`, `.next/`, `dist/`, `coverage/` — не мають бути в діффі взагалі; якщо
  зʼявились, це **Should fix** ("додай у `.gitignore`"), а не рев'ю вмісту
- згенеровані типи (`apps/frontend/.next/types/**`, Prisma Client у `dist/`)
- форматування, яке належить Prettier/ESLint (уже в _Severity_ вище)

## Scope of a review

Review the branch's own diff — `git diff main...HEAD` (three dots) — not the
whole tree. Read `--stat` first for the shape of the change, then the diff.

A review judges the change as submitted. Code that is merely _near_ the diff is
out of scope: if something unrelated is wrong, say so once as **Nit** or open a
separate branch (`CLAUDE.md` → _One branch, one concern_), never expand the PR.

Stay inside the author's stated intent. "This could also be a feature" is not a
review finding.

## Severity

Every finding carries one of three labels. A reviewer who cannot pick a label
does not have a finding.

- **Blocker** — merging it breaks something: wrong behaviour, a security or
  ownership hole, a destructive migration without a path, a broken build or
  test, a violated architectural boundary (see below). Blockers are stated as a
  concrete failure: the input, the state, and the wrong result.
- **Should fix** — correct but will cost later: a missing test for a branch the
  diff introduces, an error shape that leaks information, a duplicated rule that
  now has two homes, a DTO that lives outside `@repo/shared`.
- **Nit** — taste, naming, comment wording. Prefixed `Nit:` and never blocking.

Do not report: style the formatter owns (Prettier/ESLint run in CI),
hypotheticals with no input that triggers them, or a rewrite of a working
approach into a different working approach.

## Architecture — the boundaries that block

**Backend, CQRS between modules.** A module's public surface is its
`contracts/` folder. Flag as a Blocker:

- an import of another module's service, repository, handler or mapper — only
  `@/<module>/contracts` may cross a module line, and `<module>Module` is never
  imported by another module;
- a command used to read, or a query that mutates;
- a cross-module reaction wired by a direct call instead of `EventBus`
  (`UserRegisteredEvent` is the model);
- a command carrying a secret (password, token) without a redacting `toJSON()`
  — CQRS logging interceptors serialise whole command objects;
- `bcrypt` imported anywhere outside `src/security/`; hashing goes through the
  `PASSWORD_HASHER` token.

**Frontend, Feature-Sliced Design.** Imports go down the layers only —
`app → widgets → features → entities → shared` — and each slice is reached
through its `index.ts` barrel. Flag as a Blocker:

- an import that goes up or sideways (a `feature` importing a `widget`, an
  `entity` importing a `feature`, `shared` importing anything business-aware);
- a deep import into another slice's `ui/`, `model/` or `api/`;
- business logic in a route file — `src/app/**/page.tsx` stays thin and renders
  a `features`/`widgets` slice.

A new slice for a single trivial call is a **Should fix**, not a feature:
`CLAUDE.md` is explicit that behaviour, not tidiness, justifies a split.

## Security and auth

- Every new controller route is behind `JwtAuthGuard` by default. A new
  `@Public()` is a deliberate decision — the PR must say why, and the reviewer
  checks it by hand.
- **Ownership, not just existence.** A foreign key proves a row exists, not who
  owns it. Any handler that accepts an id from the client verifies it against
  `command.userId` / `query.userId` — see `CreateTransactionHandler` asking
  `GetCategoryByIdQuery` before writing. A missing ownership check is a Blocker.
- **No new oracles.** An unknown id and another user's id return the same 404;
  a wrong password and an unknown email return the same 401. A diff that makes
  the two distinguishable — by status, message, or timing — is a Blocker.
- Rate limits: auth-shaped routes need their own `@Throttle`, not the global
  100/min. Check `loginTracker` keying (IP **and** email) survives the change.
- Secrets never reach logs, error bodies, read models, or the client bundle. No
  secret in a `NEXT_PUBLIC_*` variable; new env vars are added to
  `.env.example` and to `validate-env.ts`.
- DTOs carry `class-validator` decorators on every field — the global
  `ValidationPipe` (`whitelist: true`) strips what is not declared, so an
  undecorated field silently arrives as `undefined`.

## Data and contracts

- A new or changed endpoint defines its DTO in `packages/shared/src/index.ts`
  first; both apps import from `@repo/shared`. A response type hand-written in
  the frontend is a Should fix.
- Money stays `Prisma.Decimal` on the backend and a string across the wire —
  never a JS `number`. A `parseFloat` on an amount is a Blocker.
- Prisma models are PascalCase with `@@map` to snake_case; IDs are UUIDs.
- A migration that drops or narrows a column is called out in the PR body as
  destructive, with the path. The reviewer checks the migration file, not just
  the schema.
- Dates cross the wire as ISO strings; construct `new Date(...)` in the handler,
  not in the DTO.

## Frontend data flow

- Server data is read through TanStack Query, not a `useEffect` + `fetch`. A
  new query gets a stable, parameterised key in the entity's `api/*-queries.ts`.
- A mutation invalidates every key its write can stale — a new transaction
  touches both the list and the month summary.
- Anything that changes the session clears the query cache (see
  `fix(session): clear the query cache when the session changes`); a new
  sign-in/sign-out path that skips it is a Blocker — it leaks the previous
  user's data into the next session.
- All network access goes through `shared/api` `apiFetch`; a raw `fetch` to the
  backend in a component bypasses the token provider and the 401 handling.
- Loading and error states are rendered, not assumed. User-facing copy is
  Ukrainian, matching the existing strings.

## Tests

- A bug fix comes with the test that fails without it.
- A new endpoint comes with an e2e spec in `apps/backend/test/` covering the
  happy path, the unauthenticated 401, and the other-user 404.
- Tests assert behaviour through the bus or HTTP, not handler internals; the
  fast fake hasher stays in place of bcrypt.
- `npm run lint`, `npm run format:check` and `npm run test:e2e --workspace=apps/backend`
  are the reviewer's baseline — a red one is a Blocker regardless of the diff.

## PR hygiene

Checked against `CLAUDE.md` → _Pull requests_ / _Commits_:

- title is a Conventional Commit header, imperative, lowercase, ≤72 chars, with
  a scope that names the module or slice;
- the body follows the section order (Що реалізовано / Ендпоінти / Схема /
  Файли / Як перевірити / Ризики), says "нових ендпоінтів немає" out loud when
  there are none, and is written from the diff;
- one concern per branch; no drive-by formatting sweeps mixed into a feature;
- `BREAKING CHANGE:` footer with a migration path where the contract changes.

These are **Should fix**, not Blockers — except a missing or wrong
`BREAKING CHANGE` note, which is a Blocker.

## How a finding is written

One finding, one comment, anchored to the line it is about:

```
Blocker — ownership: `UpdateTransactionHandler` trusts `command.categoryId`
without `GetCategoryByIdQuery`. A user PATCHing with another account's category
id moves their transaction under a category they cannot see.
```

State the defect and the concrete failure; the fix is the author's to choose.
Do not paste a diff unless the fix is a one-liner and genuinely unambiguous.
Approve when nothing is left above **Nit** — a review that ends in silence is
not an approval.
