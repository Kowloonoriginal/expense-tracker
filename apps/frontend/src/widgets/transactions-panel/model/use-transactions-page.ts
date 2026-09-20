'use client';

import type { TransactionFiltersDto } from '@repo/shared';
import { useTransactions } from '@/entities/transaction';
import { toMessage } from '@/shared/api/error-message';

export const PAGE_SIZE = 10;

/**
 * One page of transactions. No `reload()` any more: `useCreateTransaction`
 * invalidates the transaction keys, so the list refreshes itself.
 */
export function useTransactionsPage(
  page: number,
  filters: TransactionFiltersDto,
) {
  const { data, error, isLoading, isFetching } = useTransactions({
    ...filters,
    page,
    limit: PAGE_SIZE,
  });

  const total = data?.total ?? 0;

  return {
    transactions: data?.items ?? [],
    error: error ? toMessage(error) : null,
    isLoading,
    isFetching,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
