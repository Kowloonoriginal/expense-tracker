import type { TransactionListQueryDto } from '@repo/shared';

/**
 * Serialises a list query, dropping empty values.
 *
 * That dropping is load-bearing: an unset `<select>` yields `''`, and sending
 * `type=` would fail the backend's `@IsEnum` with a 400 rather than meaning
 * "no filter".
 */
export function buildTransactionsQuery(query: TransactionListQueryDto): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const serialised = params.toString();

  return serialised ? `?${serialised}` : '';
}
