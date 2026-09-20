'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, User } from '@repo/shared';
import { setUnauthorizedHandler } from '@/shared/api/client';
import { me } from '../api/auth-api';
import {
  clearSession,
  getStoredUser,
  saveSession,
  saveUser,
} from './session-storage';

interface SessionContextValue {
  user: User | null;
  /** True until localStorage has been read — nothing session-dependent should render yet. */
  isLoading: boolean;
  startSession: (auth: AuthResponse) => void;
  endSession: () => void;
  /** Re-reads /auth/me in the background; a revoked token surfaces here. */
  refreshUser: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // The query cache is not scoped by user, so it has to be emptied whenever the
  // session changes. Without this, signing out and signing in as someone else
  // in the same tab renders the previous user's categories, transactions and
  // month summary from cache — immediately, and with no refetch at all while
  // the entries are still inside staleTime.
  const queryClient = useQueryClient();

  // Read in an effect, not in the initial state: localStorage does not exist on
  // the server, and the first client render has to match the server's markup.
  useEffect(() => {
    setUser(getStoredUser());
    setIsLoading(false);
  }, []);

  // One place for the stale-token reaction. apiFetch only fires this for a 401
  // that carried a token, so a failed login never reaches here.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setUser(null);
      queryClient.clear();
      router.replace('/login');
    });

    return () => setUnauthorizedHandler(null);
  }, [router, queryClient]);

  const startSession = useCallback(
    (auth: AuthResponse) => {
      // Cheap insurance for the path where a sign-in follows something other
      // than a clean endSession — a crashed tab, a restored history entry.
      queryClient.clear();
      saveSession(auth);
      setUser(auth.user);
    },
    [queryClient],
  );

  const endSession = useCallback(() => {
    clearSession();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await me();
      saveUser(fresh);
      setUser(fresh);
    } catch {
      // Swallowed on purpose: being offline should not blank the profile. A 401
      // is handled globally by the effect above, which signs the user out.
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, startSession, endSession, refreshUser }),
    [user, isLoading, startSession, endSession, refreshUser],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used inside a SessionProvider');
  }

  return context;
}
