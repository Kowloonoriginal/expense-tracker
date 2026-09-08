# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expense tracker — npm workspaces monorepo with three packages.

## Commands

```bash
# Development
npm run dev:frontend        # Next.js on :3000
npm run dev:backend         # Nest.js on :3001

# Build
npm run build               # Build both apps
npm run build:frontend
npm run build:backend

# Linting & Formatting
npm run lint                # ESLint across all workspaces
npm run format              # Prettier write
npm run format:check        # Prettier check

# Tests
npm run test:e2e --workspace=apps/backend   # e2e suite (needs PostgreSQL running)

# Database
docker compose up -d                              # Start PostgreSQL
npm run prisma:generate --workspace=apps/backend   # Generate Prisma client
npm run prisma:migrate --workspace=apps/backend    # Run migrations
npm run prisma:studio --workspace=apps/backend     # Open Prisma Studio
```

## Architecture

**Monorepo layout (npm workspaces):**

- `apps/frontend` — Next.js 16 (App Router), Tailwind CSS 4, port 3000
- `apps/backend` — Nest.js 11, Prisma 6, JWT auth (Passport.js), port 3001
- `packages/shared` — `@repo/shared`: shared TypeScript interfaces and DTOs, imported by both apps as raw TS (no build step)

**Data flow:** Frontend → REST API → Nest.js controllers → CommandBus/QueryBus → handlers → repositories → Prisma → PostgreSQL

**CQRS between modules.** Backend modules do not import each other's services. A
module's public surface is its `contracts/` folder (command, query and event
classes plus read models); everything else — repositories, handlers, hashers —
is internal. To reach another module, dispatch its command or query on the bus:

```ts
// auth reaching users — imports contract classes only, never UsersModule
await this.commandBus.execute(new CreateUserCommand(email, name, password));
const userId = await this.queryBus.execute(
  new VerifyPasswordQuery(email, password),
);
```

`CqrsModule.forRoot()` is registered globally in `AppModule`, so the buses are
injectable anywhere. Commands mutate and must not be used to read; queries read
and must not mutate. Cross-module reactions go through `EventBus` — see
`UserRegisteredEvent` and its subscriber in `src/notifications/`.

Commands carrying secrets define `toJSON()` that redacts them: CQRS logging
interceptors serialise whole command objects.

**Frontend architecture (Feature-Sliced Design).** `apps/frontend/src` is
organized in FSD layers. A layer may import from itself or any layer strictly
below it — never sideways or up:

```
app        Next.js App Router itself — routing, layouts, providers.
           No separate FSD "app" folder: src/app/layout.tsx and globals.css
           already fill that role. Route files stay thin and render straight
           from a features or widgets slice.
             ↓
widgets    A self-contained block of the page composing entities and features:
           widgets/header (user name + sign-out, or a sign-in link).
             ↓
features   A user-facing action/flow: features/login, features/register.
           UI + local form logic (react-hook-form + zod). Orchestrates entities.
             ↓
entities   A business concept, its data access and its state: entities/session
           holds the auth API calls, the stored-session read/write, the
           SessionProvider/useSession context and the auth error copy.
             ↓
shared     Generic, business-agnostic code with no knowledge of any
           feature/entity: shared/api (fetch client), shared/ui (the
           shadcn/ui kit), shared/lib (small helpers, e.g. cn()).
```

Each slice exposes only an `index.ts` barrel — other layers import from that
barrel, never reaching into a slice's internal `ui/`/`model/`/`api/` files
directly (mirrors the backend's `contracts/`-only rule above). The FSD `pages`
layer is skipped: Next's `app/` routing already fills it.

Resist splitting a slice off for a single trivial call — signing out lives in
`entities/session` (`endSession()`), not in a `features/logout` slice, because
there is no logic beyond clearing the session. Split when behaviour appears.

**Shared types contract:** Entity interfaces and DTOs live in `packages/shared/src/index.ts`. Both apps import from `@repo/shared`. When adding a new endpoint, define its DTO in shared first.

**Prisma schema** is at `apps/backend/prisma/schema.prisma`. Models use PascalCase in code, `@@map` to snake_case table names in PostgreSQL. All IDs are UUIDs.

**Auth:** JWT-based with Passport.js. `JwtAuthGuard` is registered as a global
`APP_GUARD`, so every route requires a token unless marked `@Public()` — a new
controller is protected the moment it is added. `JwtStrategy.validate()` re-reads
the user on each request, so a deleted account loses access immediately.

Password hashing lives behind the `PASSWORD_HASHER` token in `src/security/`;
no other module imports bcrypt, and tests swap in a fast fake.

**Rate limiting:** global `ThrottlerGuard` at 100 req/min. `/auth/login` is capped
at 5/min keyed on IP **and** email (`loginTracker`), `/auth/register` at 10/hour.
Failed logins add a randomised delay (`jitter()`) and return an identical 401 for
a wrong password and an unknown email.

## Environment

Copy `.env.example` to `.env` at the project root. Key vars:

- `DATABASE_URL` — PostgreSQL connection string (matches docker-compose defaults)
- `JWT_SECRET` / `JWT_EXPIRES_IN` — auth token config
- `NEXT_PUBLIC_API_URL` — backend URL for the frontend (default `http://localhost:3001`)

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
("add monthly summary", not "Added monthly summary."). The body explains *why* —
the mechanism is already in the diff. Wrap it at 72 columns.

**Breaking changes** get a `!` after the scope and a `BREAKING CHANGE:` footer
explaining the migration path: `feat(shared)!: make Transaction.amount a string`.

One logical change per commit. A schema change and the module that uses it
belong together (they don't build separately); an unrelated formatting sweep
does not. Commits Claude Code authors end with the `Co-Authored-By` trailer.

## Conventions

- Frontend uses `@/*` path alias mapping to `./src/*`
- Backend uses `@/*` path alias mapping to `./src/*`
- Backend uses global `ValidationPipe` with `whitelist: true` — unknown fields are stripped from requests
- CORS is configured to allow the frontend origin
