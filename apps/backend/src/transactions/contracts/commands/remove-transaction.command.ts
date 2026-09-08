/** `userId` scopes the lookup — a transaction owned by someone else is not found. */
export class RemoveTransactionCommand {
  constructor(
    readonly id: string,
    readonly userId: string,
  ) {}
}
