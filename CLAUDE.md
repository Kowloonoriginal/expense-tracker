# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expense tracker — npm workspaces monorepo with three packages.

## Tech Stack

**Frontend** (`apps/frontend`): Next.js 16 (App Router), React 19, TypeScript
5.6, Tailwind CSS 4, `@base-ui/react` + `shadcn` for the component kit,
`react-hook-form` + `zod` for form validation, `lucide-react` for icons.

**Backend** (`apps/backend`): Nest.js 11, TypeScript 5.6, `@nestjs/cqrs` for
the command/query buses, Prisma 6 as the ORM, JWT auth via `@nestjs/jwt` +
Passport.js (`passport-jwt`), `bcrypt` for password hashing, `@nestjs/throttler`
for rate limiting, `class-validator` + `class-transformer` for DTO validation.
Jest for unit and e2e tests.

**Shared** (`packages/shared`): plain TypeScript, no build step or runtime deps
— consumed as raw `.ts` by both apps via the `@repo/shared` workspace package.

**Database:** PostgreSQL, run locally via Docker Compose.

**Tooling:** ESLint + Prettier across all workspaces, npm workspaces for the
monorepo (no Turborepo/Nx).

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

Monorepo layout: `apps/frontend` (Next.js, port 3000), `apps/backend`
(Nest.js, port 3001), `packages/shared` (`@repo/shared`, raw TS, no build
step). Data flow: Frontend → REST API → Nest.js controllers →
CommandBus/QueryBus → handlers → repositories → Prisma → PostgreSQL.

Full details — CQRS module boundaries, Feature-Sliced Design layers on the
frontend, the Prisma schema, JWT auth and rate limiting — live in
@docs/ARCHITECTURE.md.

## Environment

Copy `.env.example` to `.env` at the project root. Key vars:

- `DATABASE_URL` — PostgreSQL connection string (matches docker-compose defaults)
- `JWT_SECRET` / `JWT_EXPIRES_IN` — auth token config
- `NEXT_PUBLIC_API_URL` — backend URL for the frontend (default `http://localhost:3001`)

## Git Workflow

Branch naming, the PR body structure, and Conventional Commits rules live in
@docs/GIT_WORKFLOW.md — read it before opening a branch, writing a PR
description, or authoring a commit.

## Conventions

- Frontend uses `@/*` path alias mapping to `./src/*`
- Backend uses `@/*` path alias mapping to `./src/*`
- Backend uses global `ValidationPipe` with `whitelist: true` — unknown fields are stripped from requests
- CORS is configured to allow the frontend origin
