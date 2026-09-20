import type { Paginated, Transaction } from '@repo/shared';

/**
 * The only shape a transaction *list* takes when it leaves TransactionsModule.
 *
 * `items` — the page's transactions; `total` — row count across all pages
 * under the same filters; `page`/`limit` — echoed back as requested.
 */
export type PaginatedTransactionsReadModel = Paginated<Transaction>;
