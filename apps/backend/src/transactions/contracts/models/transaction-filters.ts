import type { TransactionFiltersDto } from '@repo/shared';

/**
 * Filter payload of GetTransactionsQuery — ISO strings exactly as received.
 *
 * `dateFrom`/`dateTo` — optional inclusive/date-shape-dependent bounds (see
 * `GetTransactionsHandler.toExclusiveEnd`); `type` — `INCOME`/`EXPENSE`;
 * `categoryId` — restrict to one category. Every field is optional; an absent
 * field is omitted from the query entirely rather than matching everything.
 */
export type TransactionFilters = TransactionFiltersDto;
