'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './query-client';

/**
 * `useState` with an initialiser, not `useMemo` and not a module constant:
 * React may drop a `useMemo` value, and the client has to survive every
 * re-render or the whole cache is thrown away mid-session.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
