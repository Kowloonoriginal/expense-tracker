/**
 * Query to fetch one transaction, dispatched on the `QueryBus` and handled by
 * `GetTransactionByIdHandler`.
 *
 * `userId` scopes the lookup — a transaction owned by someone else is not found.
 */
export class GetTransactionByIdQuery {
  /**
   * @param id - Id of the transaction to fetch.
   * @param userId - Id of the authenticated user; the transaction must belong
   *   to this user.
   */
  constructor(
    readonly id: string,
    readonly userId: string,
  ) {}
}
