/** `userId` comes from the authenticated request, never from the request body. */
export class CreateCategoryCommand {
  constructor(
    readonly userId: string,
    readonly name: string,
    readonly color: string,
    readonly icon: string,
  ) {}
}
