# Backend — apps/backend

Nest.js 11 on port 3001. Loaded automatically when working on files in this
workspace; the repo-wide rules stay in the root `CLAUDE.md`.

## Stack

TypeScript 5.6, `@nestjs/cqrs` for the command/query buses, Prisma 6 as the
ORM, JWT auth via `@nestjs/jwt` + Passport.js (`passport-jwt`), `bcrypt` for
password hashing, `@nestjs/throttler` for rate limiting, `class-validator` +
`class-transformer` for DTO validation. Jest for unit and e2e tests.

Modules: `auth`, `users`, `categories`, `transactions`, `notifications`,
`security`, `prisma`, `config`, `common`.

## Commands

```bash
npm run dev:backend                            # from the repo root, :3001
npm run test:e2e --workspace=apps/backend      # needs PostgreSQL running
npm run prisma:generate --workspace=apps/backend
npm run prisma:migrate --workspace=apps/backend
npm run prisma:studio --workspace=apps/backend
```

## CQRS between modules

Modules do not import each other's services. A module's public surface is its
`contracts/` folder (command, query and event classes plus read models);
everything else — repositories, handlers, hashers — is internal. To reach
another module, dispatch its command or query on the bus:

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

## Prisma

Schema at `prisma/schema.prisma`. Models use PascalCase in code, `@@map` to
snake_case table names in PostgreSQL. All IDs are UUIDs. A foreign key proves a
row exists but not who owns it — verify ownership over the bus (e.g.
`GetCategoryByIdQuery`) before create or update.

## Auth and security

JWT-based with Passport.js. `JwtAuthGuard` is registered as a global
`APP_GUARD`, so every route requires a token unless marked `@Public()` — a new
controller is protected the moment it is added. `JwtStrategy.validate()`
re-reads the user on each request, so a deleted account loses access
immediately.

Password hashing lives behind the `PASSWORD_HASHER` token in `src/security/`;
no other module imports bcrypt, and tests swap in a fast fake.

**Rate limiting:** global `ThrottlerGuard` at 100 req/min. `/auth/login` is
capped at 5/min keyed on IP **and** email (`loginTracker`), `/auth/register` at
10/hour. Failed logins add a randomised delay (`jitter()`) and return an
identical 401 for a wrong password and an unknown email.

## Conventions

- `@/*` path alias maps to `./src/*`
- Global `ValidationPipe` with `whitelist: true` — unknown fields are stripped
  from requests, so a DTO field that is not declared never arrives
- New endpoints define their DTO in `@repo/shared` first, then use it here
- CORS allows the frontend origin only
