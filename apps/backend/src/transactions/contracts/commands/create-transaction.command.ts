import type { TransactionType } from '@repo/shared';

/**
 * Command to create a transaction, dispatched on the `CommandBus` and handled
 * by `CreateTransactionHandler`.
 *
 * `userId` comes from the authenticated request, never from the request body.
 * `amount` stays a number and `date` an ISO string — contracts stay primitive,
 * the handler converts to Prisma.Decimal / Date.
 */
export class CreateTransactionCommand {
  /**
   * @param userId - Id of the authenticated user who will own the transaction.
   * @param amount - Transaction amount, positive, ≤2 decimal places.
   * @param type - `INCOME` or `EXPENSE`.
   * @param date - Transaction date as an ISO 8601 string.
   * @param categoryId - Id of the category to attach; must belong to `userId`.
   * @param description - Optional free-text note.
   */
  constructor(
    readonly userId: string,
    readonly amount: number,
    readonly type: TransactionType,
    readonly date: string,
    readonly categoryId: string,
    readonly description?: string | null,
  ) {}
}
