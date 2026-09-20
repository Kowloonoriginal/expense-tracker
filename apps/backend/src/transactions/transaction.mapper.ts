import { Prisma, Transaction } from '@prisma/client';
import { TransactionReadModel } from './contracts';

const ZERO = new Prisma.Decimal(0);

/**
 * Converts a nullable Prisma `Decimal` amount to a plain `number`.
 *
 * Prisma's `Decimal.toJSON()` emits a string, so every amount leaving the module
 * goes through here and the API stays consistently numeric. Lossless because the
 * column is `DECIMAL(12,2)`: ≤15 significant digits round-trip exactly through
 * IEEE-754.
 *
 * @param value - A `Decimal` amount, or `null` (e.g. a `groupBy` sum with no
 *   matching rows).
 * @returns The amount as a `number`; `0` when `value` is `null`.
 */
export function toAmount(value: Prisma.Decimal | null): number {
  return (value ?? ZERO).toNumber();
}

/**
 * Computes `income - expense` as a plain `number`.
 *
 * Subtracts in Decimal before converting — in float, 1000.10 - 999.99 would come
 * out as 0.10999999999994.
 *
 * @param income - Summed income for the period, or `null` if there was none.
 * @param expense - Summed expense for the period, or `null` if there was none.
 * @returns The balance (`income - expense`) as a `number`.
 */
export function toBalance(
  income: Prisma.Decimal | null,
  expense: Prisma.Decimal | null,
): number {
  return (income ?? ZERO).minus(expense ?? ZERO).toNumber();
}

/**
 * Maps a Prisma `Transaction` row to the module's public read model.
 *
 * @param transaction - Raw row as returned by `TransactionsRepository`.
 * @returns The transaction shaped for the API response / other modules,
 *   with `amount` as a `number` and dates as ISO strings.
 */
export function toTransactionReadModel(
  transaction: Transaction,
): TransactionReadModel {
  return {
    id: transaction.id,
    amount: toAmount(transaction.amount),
    // Assigning the Prisma enum to the shared union: this line stops compiling
    // the moment the two TransactionType declarations diverge.
    type: transaction.type,
    description: transaction.description,
    // Explicit, not incidental: JSON.stringify already emitted exactly this, so
    // the response body is unchanged — but now the shared type says so, and the
    // frontend can no longer call Date methods on what is really a string.
    date: transaction.date.toISOString(),
    categoryId: transaction.categoryId,
    userId: transaction.userId,
    createdAt: transaction.createdAt.toISOString(),
  };
}

/**
 * Normalizes a `description` value before it reaches Prisma.
 *
 * Three-way description handling: `undefined` leaves the column untouched,
 * `null` or blank clears it, anything else is trimmed.
 *
 * Deliberately not `value?.trim()` — optional chaining short-circuits on `null`
 * too, which would silently turn "clear it" into "leave it unchanged".
 *
 * @param value - Raw description from the command; `undefined` when the field
 *   was not sent at all.
 * @returns `undefined` to leave the column untouched, `null` to clear it, or
 *   the trimmed string to replace it.
 */
export function normalizeDescription(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
