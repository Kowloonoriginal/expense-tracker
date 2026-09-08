/** Monthly aggregation. `month` is 1-based; the window is computed in UTC. */
export class GetTransactionSummaryQuery {
  constructor(
    readonly userId: string,
    readonly month: number,
    readonly year: number,
  ) {}
}
