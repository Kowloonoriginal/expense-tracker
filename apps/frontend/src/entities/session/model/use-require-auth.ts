'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './session-context';

/**
 * The inverse of useRedirectIfAuthenticated. `isChecking` stays true both while
 * the session is unknown *and* while the redirect is in flight, so a caller that
 * honours it renders neither the protected content nor an empty flash.
 */
export function useRequireAuth(to = '/login'): { isChecking: boolean } {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(to);
    }
  }, [isLoading, user, router, to]);

  return { isChecking: isLoading || !user };
}
