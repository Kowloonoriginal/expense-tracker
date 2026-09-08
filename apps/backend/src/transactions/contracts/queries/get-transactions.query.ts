import type { TransactionFilters } from '../models/transaction-filters';

/**
 * Lists one user's transactions. Filter dates stay ISO strings here on purpose:
 * the handler needs the string's *shape* to tell a date-only bound from a full
 * timestamp (see GetTransactionsHandler).
 */
export class GetTransactionsQuery {
  constructor(
    readonly userId: string,
    readonly filters: TransactionFilters,
  ) {}
}
