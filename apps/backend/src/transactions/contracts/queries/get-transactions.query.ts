import type { TransactionFilters } from '../models/transaction-filters';
import type { Pagination } from '../models/pagination';

/**
 * Lists one user's transactions. Filter dates stay ISO strings on purpose: the
 * handler needs the string's *shape* to tell a date-only bound from a full
 * timestamp (see GetTransactionsHandler).
 *
 * Pagination is a separate argument rather than another filter field — filters
 * choose which rows exist, pagination slices the result, and folding them
 * together would make `TransactionFilters` misdescribe itself.
 */
export class GetTransactionsQuery {
  constructor(
    readonly userId: string,
    readonly filters: TransactionFilters,
    readonly pagination: Pagination,
  ) {}
}
