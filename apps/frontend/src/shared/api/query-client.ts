import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/** Retrying a 400/401/404 only delays the error the user has to see. */
function retryServerErrorsOnly(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < 2;
}

/**
 * One client per browser session, created in `QueryProvider` rather than as a
 * module singleton — a singleton is shared across requests on the server and
 * would leak one user's cached data into another's render.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that remounting a widget while navigating between
        // /dashboard and /transactions reuses the cache instead of refetching.
        staleTime: 30_000,
        retry: retryServerErrorsOnly,
      },
      mutations: {
        // A create must never be replayed on its own: a retried POST can write
        // the same transaction twice.
        retry: false,
      },
    },
  });
}
