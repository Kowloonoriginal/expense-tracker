# Frontend — apps/frontend

Next.js 16 (App Router) on port 3000. Loaded automatically when working on
files in this workspace; the repo-wide rules stay in the root `CLAUDE.md`.

## Stack

React 19, TypeScript 5.6, Tailwind CSS 4, `@base-ui/react` + `shadcn` for the
component kit, `react-hook-form` + `zod` for form validation, `lucide-react`
for icons. Types and DTOs come from `@repo/shared` — never redeclare a shape
the backend already exports.

## Commands

```bash
npm run dev:frontend          # from the repo root, :3000
npm run build:frontend
npm run lint --workspace=apps/frontend
```

## Feature-Sliced Design

`src` is organized in FSD layers. A layer may import from itself or any layer
strictly below it — never sideways or up:

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
directly (mirrors the backend's `contracts/`-only rule). The FSD `pages` layer
is skipped: Next's `app/` routing already fills it.

Resist splitting a slice off for a single trivial call — signing out lives in
`entities/session` (`endSession()`), not in a `features/logout` slice, because
there is no logic beyond clearing the session. Split when behaviour appears.

## Conventions

- `@/*` path alias maps to `./src/*`
- The theme is dark by default (navy ground, lime `--primary`). Add the
  `paper` class to a block to flip it into the light "sheet" palette — every
  token inside re-resolves. Income amounts use `text-income`
- Colours come from the theme tokens in `src/app/globals.css`
  (`text-muted-foreground`, `bg-background`…), never hardcoded Tailwind
  palette classes like `text-gray-600` — those break dark mode
- `next/font` subsets must cover the copy actually rendered: the UI is
  Ukrainian, so `Manrope` loads `['latin', 'latin-ext', 'cyrillic']`. A missing
  subset fails silently into a fallback font
- `NEXT_PUBLIC_API_URL` points at the backend (default `http://localhost:3001`)
