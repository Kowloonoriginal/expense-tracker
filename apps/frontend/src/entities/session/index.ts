/**
 * Public surface of the session entity — other layers import only from here.
 *
 * Deliberately narrower than the entity's full internals: `saveSession`,
 * `clearSession`, `getToken`, `getStoredUser`, `saveUser` and `me` all stay
 * internal. `SessionProvider` exists precisely so storage and React state
 * move together (`startSession`/`endSession`/`refreshUser`); exporting the
 * raw storage primitives alongside it would let any widget desync them —
 * e.g. call the barrel's `clearSession()` directly and the header keeps
 * showing the signed-out user's name until something else forces a re-read.
 * `useRequireAuth` stays internal too — its only consumer is `RequireAuth`,
 * in this same entity.
 */
export { login, register } from './api/auth-api';
export { SessionProvider, useSession } from './model/session-context';
export { useRedirectIfAuthenticated } from './model/use-redirect-if-authenticated';
export { RequireAuth } from './ui/RequireAuth';
export { authErrorMessage } from './model/auth-error';
