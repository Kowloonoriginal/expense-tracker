import type { Paginated, Transaction } from '@repo/shared';

/** The only shape a transaction *list* takes when it leaves TransactionsModule. */
export type PaginatedTransactionsReadModel = Paginated<Transaction>;
