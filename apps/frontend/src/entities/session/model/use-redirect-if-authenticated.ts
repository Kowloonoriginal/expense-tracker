'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './session-context';

/**
 * Sends an already signed-in visitor away from /login and /register.
 * `isChecking` stays true until the session is known (and while the redirect is
 * in flight), so a form never flashes before navigating away.
 */
export function useRedirectIfAuthenticated(to = '/'): { isChecking: boolean } {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(to);
    }
  }, [isLoading, user, router, to]);

  return { isChecking: isLoading || Boolean(user) };
}
