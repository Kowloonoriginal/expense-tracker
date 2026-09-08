import type { AuthResponse, User } from '@repo/shared';
import { setAuthTokenProvider } from '@/shared/api/client';

const TOKEN_KEY = 'expense-tracker:accessToken';
const USER_KEY = 'expense-tracker:user';

export function saveSession(auth: AuthResponse): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, auth.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Refreshes only the user half, leaving the token alone (see refreshUser). */
export function saveUser(user: User): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

// Registered at module scope rather than in an effect: child effects run before
// parent effects, so a widget's first fetch would beat a provider-level
// useEffect. Module evaluation happens before any render, and the root layout
// imports this entity unconditionally, so this always runs first.
setAuthTokenProvider(getToken);
