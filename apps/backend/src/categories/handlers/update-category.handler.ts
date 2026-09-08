import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../categories.repository';
import { toCategoryReadModel } from '../category.mapper';
import { CategoryReadModel, UpdateCategoryCommand } from '../contracts';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<
  UpdateCategoryCommand,
  CategoryReadModel
> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(command: UpdateCategoryCommand): Promise<CategoryReadModel> {
    const existing = await this.categoriesRepository.findByIdForUser(
      command.id,
      command.userId,
    );

    if (!existing) {
      // The same 404 whether the id is unknown or owned by somebody else: the
      // response must never reveal that another user's category exists.
      throw new NotFoundException('Category not found');
    }

    // Undefined fields are ignored by Prisma, so a partial PATCH leaves the
    // rest of the row untouched.
    const updated = await this.categoriesRepository.update(command.id, {
      name: command.name?.trim(),
      color: command.color,
      icon: command.icon?.trim(),
    });

    return toCategoryReadModel(updated);
  }
}
