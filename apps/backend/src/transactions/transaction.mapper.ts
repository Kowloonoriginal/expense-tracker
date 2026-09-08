import { Prisma, Transaction } from '@prisma/client';
import { TransactionReadModel } from './contracts';

const ZERO = new Prisma.Decimal(0);

/**
 * Prisma's `Decimal.toJSON()` emits a string, so every amount leaving the module
 * goes through here and the API stays consistently numeric. Lossless because the
 * column is `DECIMAL(12,2)`: ≤15 significant digits round-trip exactly through
 * IEEE-754.
 */
export function toAmount(value: Prisma.Decimal | null): number {
  return (value ?? ZERO).toNumber();
}

/**
 * Subtracts in Decimal before converting — in float, 1000.10 - 999.99 would come
 * out as 0.10999999999994.
 */
export function toBalance(
  income: Prisma.Decimal | null,
  expense: Prisma.Decimal | null,
): number {
  return (income ?? ZERO).minus(expense ?? ZERO).toNumber();
}

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
    date: transaction.date,
    categoryId: transaction.categoryId,
    userId: transaction.userId,
    createdAt: transaction.createdAt,
  };
}

/**
 * Three-way description handling: `undefined` leaves the column untouched,
 * `null` or blank clears it, anything else is trimmed.
 *
 * Deliberately not `value?.trim()` — optional chaining short-circuits on `null`
 * too, which would silently turn "clear it" into "leave it unchanged".
 */
export function normalizeDescription(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
