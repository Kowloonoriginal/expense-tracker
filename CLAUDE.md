# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expense tracker — npm workspaces monorepo with three packages:

- `apps/frontend` — Next.js 16 (App Router), port 3000 — see its own `CLAUDE.md`
- `apps/backend` — Nest.js 11, Prisma 6, port 3001 — see its own `CLAUDE.md`
- `packages/shared` — `@repo/shared`: shared TypeScript interfaces and DTOs,
  imported by both apps as raw TS (no build step)

Each app carries its own `CLAUDE.md` with the stack, architecture and
conventions specific to it; those load automatically when working on files in
that workspace. Only repo-wide rules belong in this file.

**Data flow:** Frontend → REST API → Nest.js controllers → CommandBus/QueryBus
→ handlers → repositories → Prisma → PostgreSQL.

**Shared types contract:** entity interfaces and DTOs live in
`packages/shared/src/index.ts`. Both apps import from `@repo/shared`. When
adding a new endpoint, define its DTO in shared first — it is the one place
where the two sides agree on a shape.

**Tooling:** PostgreSQL via Docker Compose, ESLint + Prettier across all
workspaces, npm workspaces for the monorepo (no Turborepo/Nx).

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

## Environment

Copy `.env.example` to `.env` at the project root. Key vars:

- `DATABASE_URL` — PostgreSQL connection string (matches docker-compose defaults)
- `JWT_SECRET` / `JWT_EXPIRES_IN` — auth token config
- `NEXT_PUBLIC_API_URL` — backend URL for the frontend (default `http://localhost:3001`)

## Git Workflow

Branch naming, the PR body structure, and Conventional Commits rules live in
@docs/GIT_WORKFLOW.md file — read it before opening a branch, writing a PR
description, or authoring a commit.

## Memory

Project memories live in `.claude/memory/`, one fact per file, indexed by
@.claude/memory/MEMORY.md file — read that index before starting work, and save
new memories there rather than in a global directory.


## Оновлення docs 
При додавані функціонала, провіряй документацію в @.claude/docs/*