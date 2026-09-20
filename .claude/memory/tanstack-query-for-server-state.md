---
name: tanstack-query-for-server-state
description: "TanStack Query is the chosen way to read API data on the frontend"
metadata:
  type: project
---

Server state on the frontend is fetched through TanStack Query
(`@tanstack/react-query`), not through bare `fetch` in `useEffect` or manual
`useState` loading/error flags. Decided 2026-09-20.

Installed and wired up the same day: `QueryProvider`
(`shared/api/query-provider.tsx`, defaults in `shared/api/query-client.ts`)
wraps the app in `src/app/layout.tsx`, and every screen reads through query
hooks. The hand-rolled `shared/lib/use-async.ts` was deleted with it.

The FSD layering holds: `entities/*/api/*-api.ts` stays the transport layer and
is now internal to its slice, the query hooks (`entities/*/api/*-queries.ts`)
wrap it, and only those hooks plus the slice's key factory leave through
`index.ts`.

**Why:** caching, deduping, refetch and loading/error state stopped being
hand-rolled per screen — and the invalidation is what finally made the month
summary refresh after a transaction is created, which the old manual reload
never did.

**How to apply:** when a screen needs API data, add or reuse a hook in the
owning slice's `*-queries.ts` rather than calling the api module — a component
outside the entity cannot reach it anyway. Keys go through the slice's
`categoryKeys`/`transactionKeys` factory, so a mutation invalidates a whole
subtree with one call.
