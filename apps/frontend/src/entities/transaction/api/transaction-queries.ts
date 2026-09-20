'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreateTransactionDto,
  Paginated,
  Transaction,
  TransactionListQueryDto,
  TransactionSummary,
} from '@repo/shared';
import {
  createTransaction,
  getSummary,
  getTransactions,
} from './transactions-api';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (query: TransactionListQueryDto) =>
    [...transactionKeys.all, 'list', query] as const,
  summary: (month: number, year: number) =>
    [...transactionKeys.all, 'summary', { month, year }] as const,
};

/**
 * `keepPreviousData` is what makes paging dim the table instead of collapsing
 * it to a skeleton on every click — and it is also what makes the *latest*
 * request authoritative, so a slow page-2 response landing after page 3 can no
 * longer leave the table on page 2 while the pager says 3.
 */
export function useTransactions(
  query: TransactionListQueryDto,
): UseQueryResult<Paginated<Transaction>> {
  return useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => getTransactions(query),
    placeholderData: keepPreviousData,
  });
}

export function useSummary(
  month: number,
  year: number,
): UseQueryResult<TransactionSummary> {
  return useQuery({
    queryKey: transactionKeys.summary(month, year),
    queryFn: () => getSummary(month, year),
  });
}

/**
 * Invalidates `all`, not just the list: a new transaction also changes the
 * month summary, which the previous hand-rolled reload never refreshed.
 */
export function useCreateTransaction(): UseMutationResult<
  Transaction,
  Error,
  CreateTransactionDto
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}
