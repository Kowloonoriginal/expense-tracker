import type {
  CreateTransactionDto,
  Paginated,
  Transaction,
  TransactionListQueryDto,
  TransactionSummary,
} from '@repo/shared';
import { apiFetch } from '@/shared/api/client';
import { buildTransactionsQuery } from '../model/transaction-query';

export function getTransactions(
  query: TransactionListQueryDto = {},
): Promise<Paginated<Transaction>> {
  return apiFetch<Paginated<Transaction>>(
    `/transactions${buildTransactionsQuery(query)}`,
  );
}

export function createTransaction(
  dto: CreateTransactionDto,
): Promise<Transaction> {
  return apiFetch<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function getSummary(
  month: number,
  year: number,
): Promise<TransactionSummary> {
  return apiFetch<TransactionSummary>(
    `/transactions/summary?month=${month}&year=${year}`,
  );
}
