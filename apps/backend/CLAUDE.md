# Backend — apps/backend

Nest.js 11 on port 3001. Loaded automatically when working on files in this
workspace; repo-wide rules stay in the root `CLAUDE.md`.

## Backend Architecture

Request path: controller → `CommandBus`/`QueryBus` → handler → repository →
Prisma → PostgreSQL. Controllers hold no business logic; they validate input,
dispatch, and shape the response.

Stack: TypeScript 5.6, `@nestjs/cqrs`, Prisma 6, JWT via `@nestjs/jwt` +
Passport.js (`passport-jwt`), `bcrypt`, `@nestjs/throttler`,
`class-validator` + `class-transformer`. Jest for unit and e2e tests.

## Commands

```bash
npm run dev:backend                            # from the repo root, :3001
npm run test:e2e --workspace=apps/backend      # needs PostgreSQL running
npm run prisma:generate --workspace=apps/backend
npm run prisma:migrate --workspace=apps/backend
npm run prisma:studio --workspace=apps/backend
```

## Global Pipes

Set in `src/main.ts` and `src/app.module.ts`, so they apply to every route
without being declared per controller:

- `ValidationPipe` with `whitelist: true` and `transform: true` — undeclared
  fields are stripped from the body before a handler sees them, and payloads
  arrive as real DTO instances
- `JwtAuthGuard` as `APP_GUARD` (in `auth.module.ts`) — every route requires a
  token unless marked `@Public()`, so a new controller is protected the moment
  it is added
- `ThrottlerGuard` as `APP_GUARD` — 100 req/min baseline
- `PrismaClientExceptionFilter` as `APP_FILTER` — maps Prisma errors to HTTP
  responses instead of leaking a 500
- CORS allows `CORS_ORIGIN` only (default `http://localhost:3000`)
- `trust proxy` is enabled only when `TRUST_PROXY=1`; without a proxy that
  strips `X-Forwarded-For`, enabling it lets a client spoof its IP past every
  rate limit

## Modules

`auth`, `users`, `categories`, `transactions`, `notifications`, `security`,
`prisma`, `config`, `common`.

### API Endpoints

DTOs come from `@repo/shared`. Everything is behind `JwtAuthGuard` unless
marked `@Public()`.

| Method | Path                    | DTO / returns                    | Notes                                                                   |
| ------ | ----------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/`                     | —                                | `@Public()` health check                                                |
| POST   | `/auth/register`        | `RegisterDto` → `AuthResponse`   | `@Public()`, 10/hour                                                    |
| POST   | `/auth/login`           | `LoginDto` → `AuthResponse`      | `@Public()`, 5/min per IP+email, returns 200                            |
| GET    | `/auth/me`              | → current user                   |                                                                         |
| POST   | `/categories`           | `CreateCategoryDto`              |                                                                         |
| GET    | `/categories`           | → list                           |                                                                         |
| PATCH  | `/categories/:id`       | `UpdateCategoryDto`              |                                                                         |
| DELETE | `/categories/:id`       | —                                | 204                                                                     |
| POST   | `/transactions`         | `CreateTransactionDto`           |                                                                         |
| GET    | `/transactions`         | `GetTransactionsQueryDto` → list |                                                                         |
| GET    | `/transactions/summary` | `TransactionSummaryQueryDto`     | **must stay declared above `/:id`** — Nest matches in declaration order |
| GET    | `/transactions/:id`     | → one                            |                                                                         |
| PATCH  | `/transactions/:id`     | `UpdateTransactionDto`           |                                                                         |
| DELETE | `/transactions/:id`     | —                                | 204                                                                     |

When adding an endpoint, define its DTO in `packages/shared/src/index.ts`
first, then use it here.

This table is enforced: `npm run check:endpoint-docs --workspace=apps/backend`
reads the routes back out of the controllers and fails on any drift in either
direction. CI runs it on every PR that touches a controller or this file.

## Patterns

**CQRS between modules.** Modules do not import each other's services. A
module's public surface is its `contracts/` folder (command, query and event
classes plus read models); everything else — repositories, handlers, hashers —
is internal. To reach another module, dispatch on the bus:

```ts
// auth reaching users — imports contract classes only, never UsersModule
await this.commandBus.execute(new CreateUserCommand(email, name, password));
const userId = await this.queryBus.execute(
  new VerifyPasswordQuery(email, password),
);
```

`CqrsModule.forRoot()` is global, so the buses inject anywhere. Commands mutate
and must not read; queries read and must not mutate. Cross-module reactions go
through `EventBus` — see `UserRegisteredEvent` and its subscriber in
`src/notifications/`.

**Redacted commands.** A command carrying a secret defines `toJSON()` that
redacts it: CQRS logging interceptors serialise whole command objects.

**Ownership is not proven by a foreign key.** An FK shows a row exists, not who
owns it — verify over the bus (e.g. `GetCategoryByIdQuery`) before create or
update.

**Hashing behind a token.** `PASSWORD_HASHER` in `src/security/` is the only
place bcrypt is imported; tests swap in a fast fake.

**Uniform auth failures.** A wrong password and an unknown email return an
identical 401, after a randomised delay (`jitter()`), so the response cannot be
used to enumerate accounts.

### Database

Schema at `prisma/schema.prisma`. Models are PascalCase in code and `@@map` to
snake_case tables: `User`→`users`, `Category`→`categories`,
`Transaction`→`transactions`, `Expense`→`expenses`. All IDs are UUIDs.

### Environment Variables

Read through `ConfigService`; `src/config/validate-env.ts` refuses to boot on a
bad value.

| Var              | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string                          |
| `JWT_SECRET`     | required, ≥32 chars, rejects known placeholders       |
| `JWT_EXPIRES_IN` | token lifetime (default `7d`)                         |
| `PORT`           | default 3001                                          |
| `CORS_ORIGIN`    | default `http://localhost:3000`                       |
| `TRUST_PROXY`    | `1` only behind a proxy that strips `X-Forwarded-For` |

## Conventions

- `@/*` path alias maps to `./src/*`
- A route's DTO lives in `@repo/shared`, never redeclared locally
