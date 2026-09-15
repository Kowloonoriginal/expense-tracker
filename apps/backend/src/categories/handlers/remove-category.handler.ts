import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../categories.repository';
import { RemoveCategoryCommand } from '../contracts';

@CommandHandler(RemoveCategoryCommand)
export class RemoveCategoryHandler implements ICommandHandler<
  RemoveCategoryCommand,
  void
> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(command: RemoveCategoryCommand): Promise<void> {
    const existing = await this.categoriesRepository.findByIdForUser(
      command.id,
      command.userId,
    );

    if (!existing) {
      // Same 404 for an unknown id and for another user's category.
      throw new NotFoundException('Category not found');
    }

    // Expenses referencing this category cascade away with it, but
    // transactions do not (see schema.prisma) — a category with recorded
    // transactions fails this delete with a 409 rather than silently
    // destroying financial history. PrismaClientExceptionFilter maps the
    // resulting P2003 to that response.
    await this.categoriesRepository.delete(command.id);
  }
}
