/**
 * Query for a user's monthly income/expense summary, dispatched on the
 * `QueryBus` and handled by `GetTransactionSummaryHandler`.
 *
 * Monthly aggregation. `month` is 1-based; the window is computed in UTC.
 */
export class GetTransactionSummaryQuery {
  /**
   * @param userId - Id of the authenticated user whose transactions are summed.
   * @param month - 1-based month (1 = January, 12 = December).
   * @param year - Four-digit year.
   */
  constructor(
    readonly userId: string,
    readonly month: number,
    readonly year: number,
  ) {}
}
