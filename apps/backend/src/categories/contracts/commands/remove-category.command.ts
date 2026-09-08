/** `userId` scopes the lookup — a category owned by someone else is not found. */
export class RemoveCategoryCommand {
  constructor(
    readonly id: string,
    readonly userId: string,
  ) {}
}
