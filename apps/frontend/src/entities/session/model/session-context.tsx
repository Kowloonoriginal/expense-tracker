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
import type { AuthResponse, User } from '@repo/shared';
import { clearSession, getStoredUser, saveSession } from './session-storage';

interface SessionContextValue {
  user: User | null;
  /** True until localStorage has been read — nothing session-dependent should render yet. */
  isLoading: boolean;
  startSession: (auth: AuthResponse) => void;
  endSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Read in an effect, not in the initial state: localStorage does not exist on
  // the server, and the first client render has to match the server's markup.
  useEffect(() => {
    setUser(getStoredUser());
    setIsLoading(false);
  }, []);

  const startSession = useCallback((auth: AuthResponse) => {
    saveSession(auth);
    setUser(auth.user);
  }, []);

  const endSession = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, startSession, endSession }),
    [user, isLoading, startSession, endSession],
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
