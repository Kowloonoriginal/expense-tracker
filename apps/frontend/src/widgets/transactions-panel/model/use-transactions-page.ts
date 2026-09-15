'use client';

import type { TransactionFiltersDto } from '@repo/shared';
import { getTransactions } from '@/entities/transaction';
import { useAsync } from '@/shared/lib/use-async';

export const PAGE_SIZE = 10;

/** One page of transactions. Call the returned `reload()` to force a refetch. */
export function useTransactionsPage(
  page: number,
  filters: TransactionFiltersDto,
) {
  const { dateFrom, dateTo, type, categoryId } = filters;

  const state = useAsync(
    () => getTransactions({ ...filters, page, limit: PAGE_SIZE }),
    // Spread rather than passing `filters`: a new object literal every render
    // would retrigger the effect endlessly.
    [page, dateFrom, dateTo, type, categoryId],
  );

  const total = state.data?.total ?? 0;

  return {
    ...state,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
