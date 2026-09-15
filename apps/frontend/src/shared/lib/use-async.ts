'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from 'react';
import { toMessage } from '@/shared/api/error-message';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  /** Nothing to show yet — render a skeleton. */
  isLoading: boolean;
  /** A request is in flight, possibly over existing data — dim, don't collapse. */
  isFetching: boolean;
  reload: () => void;
}

/**
 * Runs `run` on mount, whenever `deps` change, and on `reload()`.
 *
 * Two behaviours are the reason this exists rather than a `useState`/`useEffect`
 * pair at each call site:
 *
 * 1. Previous `data` is kept while the next request is in flight, so paging dims
 *    the table instead of collapsing it to a skeleton on every click.
 * 2. A request id makes the *latest* request authoritative. Click page 1 → 2 → 3
 *    quickly and a slow page-2 response can land after page 3, leaving the table
 *    showing page 2 while the pager says 3. Out-of-order responses are dropped.
 *
 * No AbortController: apiFetch collapses an abort into a generic network
 * ApiError, so aborting would trade a race for a spurious error message.
 */
export function useAsync<T>(
  run: () => Promise<T>,
  deps: DependencyList,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [version, setVersion] = useState(0);

  // `run` is a fresh closure every render; holding it in a ref keeps it out of
  // the effect's dependencies so callers need not memoise it.
  const runRef = useRef(run);
  runRef.current = run;

  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // A request-id mismatch alone only rejects a *superseded* request (a
    // newer one already started) — it does not catch the component
    // unmounting entirely while this one is still in flight, since nothing
    // else changes `requestId.current` in that case. `cancelled` covers that
    // second path: without it, navigating away mid-request still runs
    // setData/setError/setIsFetching against a torn-down component.
    let cancelled = false;
    setIsFetching(true);
    // Cleared here, not just on success: otherwise a failed request's error
    // stays on screen through the next attempt, with no loading feedback,
    // until that attempt itself resolves.
    setError(null);

    runRef
      .current()
      .then((result) => {
        if (cancelled || id !== requestId.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || id !== requestId.current) return;
        setError(toMessage(err));
      })
      .finally(() => {
        if (cancelled || id !== requestId.current) return;
        setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
    // `deps` is the caller's contract and `run` is deliberately read through a
    // ref, so this list is spread rather than declared literally — the plugin
    // can't statically verify a spread array, hence the warning below. Every
    // current call site passes a fixed-length array (see call sites), so this
    // is safe today; a future variable-length `deps` would throw at runtime
    // ("the final argument passed to useEffect changed size between renders"),
    // which is the real risk this comment is flagging for the next change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return {
    data,
    error,
    isLoading: data === null && isFetching,
    isFetching,
    reload,
  };
}
