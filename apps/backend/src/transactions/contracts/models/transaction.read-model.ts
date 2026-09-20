import type { Transaction } from '@repo/shared';

/**
 * The only shape of a transaction that leaves TransactionsModule.
 *
 * `amount` is a plain `number`; `date`/`createdAt` are ISO 8601 strings, not
 * `Date` instances.
 */
export type TransactionReadModel = Transaction;
