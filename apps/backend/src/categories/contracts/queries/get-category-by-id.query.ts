/**
 * Ownership-scoped single-category read. `userId` scopes the lookup, so another
 * user's category comes back as null — indistinguishable from a missing one.
 */
export class GetCategoryByIdQuery {
  constructor(
    readonly id: string,
    readonly userId: string,
  ) {}
}
