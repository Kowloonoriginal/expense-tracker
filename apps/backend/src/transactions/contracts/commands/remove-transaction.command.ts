/**
 * Command to delete a transaction, dispatched on the `CommandBus` and handled
 * by `RemoveTransactionHandler`.
 *
 * `userId` scopes the lookup — a transaction owned by someone else is not found.
 */
export class RemoveTransactionCommand {
  /**
   * @param id - Id of the transaction to delete.
   * @param userId - Id of the authenticated user; the transaction must belong
   *   to this user.
   */
  constructor(
    readonly id: string,
    readonly userId: string,
  ) {}
}
