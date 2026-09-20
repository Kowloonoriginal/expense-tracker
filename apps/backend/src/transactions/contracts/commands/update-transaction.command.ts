import type { TransactionType } from '@repo/shared';

/**
 * Command to partially update a transaction, dispatched on the `CommandBus`
 * and handled by `UpdateTransactionHandler`.
 *
 * A partial update. `description` is three-way: `undefined` leaves it alone,
 * `null` clears it, a string replaces it.
 */
export class UpdateTransactionCommand {
  /**
   * @param id - Id of the transaction to update.
   * @param userId - Id of the authenticated user; the transaction (and, if
   *   given, `categoryId`) must belong to this user.
   * @param amount - New amount, or `undefined` to leave it unchanged.
   * @param type - New type, or `undefined` to leave it unchanged.
   * @param date - New date (ISO 8601), or `undefined` to leave it unchanged.
   * @param categoryId - New category id, or `undefined` to leave it unchanged.
   * @param description - New description (`null` clears it), or `undefined`
   *   to leave it unchanged.
   */
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly amount?: number,
    readonly type?: TransactionType,
    readonly date?: string,
    readonly categoryId?: string,
    readonly description?: string | null,
  ) {}
}
