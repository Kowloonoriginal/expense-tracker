/** Lists one user's categories; there is no unscoped "all categories" read. */
export class GetCategoriesQuery {
  constructor(readonly userId: string) {}
}
