/**
 * A partial update: any `undefined` field is left untouched by Prisma.
 * `userId` scopes the lookup — a category owned by someone else is not found.
 */
export class UpdateCategoryCommand {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly name?: string,
    readonly color?: string,
    readonly icon?: string,
  ) {}
}
