/** Public surface of the session entity — other layers import only from here. */
export { login, register, me } from './api/auth-api';
export {
  saveSession,
  saveUser,
  getToken,
  getStoredUser,
  clearSession,
} from './model/session-storage';
export { SessionProvider, useSession } from './model/session-context';
export { useRedirectIfAuthenticated } from './model/use-redirect-if-authenticated';
export { useRequireAuth } from './model/use-require-auth';
export { RequireAuth } from './ui/RequireAuth';
export { authErrorMessage } from './model/auth-error';
