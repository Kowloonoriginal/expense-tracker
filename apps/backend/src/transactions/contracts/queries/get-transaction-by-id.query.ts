/** `userId` scopes the lookup — a transaction owned by someone else is not found. */
export class GetTransactionByIdQuery {
  constructor(
    readonly id: string,
    readonly userId: string,
  ) {}
}
