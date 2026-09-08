'use client';

import { useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import { useSession } from '../model/session-context';
import { useRequireAuth } from '../model/use-require-auth';

/**
 * Gate for authenticated routes.
 *
 * `children` are not mounted while the session is unknown, so an anonymous
 * visitor never sees the shell *and* the widgets' effects never fire a
 * token-less request. An authenticated visitor sees a skeleton for the one tick
 * it takes to read localStorage, not a redirect blink.
 *
 * This is a UX guard, not a security boundary — the token lives in localStorage
 * where no middleware can read it. The boundary is the backend's global
 * JwtAuthGuard.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isChecking } = useRequireAuth();
  const { refreshUser } = useSession();

  // Background re-read: a renamed account shows up without re-login, and a
  // revoked token is rejected here rather than on the first thing clicked.
  // Deliberately not awaited — the stored user is good enough to paint with.
  useEffect(() => {
    if (!isChecking) void refreshUser();
  }, [isChecking, refreshUser]);

  if (isChecking) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
