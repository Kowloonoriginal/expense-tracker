'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/entities/session';

/**
 * A route group, so it adds no URL segment — it exists purely to hang the auth
 * guard and the page container on every authenticated route at once.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8">
        {children}
      </main>
    </RequireAuth>
  );
}
