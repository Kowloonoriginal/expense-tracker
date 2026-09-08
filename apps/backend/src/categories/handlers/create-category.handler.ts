import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../categories.repository';
import { toCategoryReadModel } from '../category.mapper';
import { CategoryReadModel, CreateCategoryCommand } from '../contracts';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<
  CreateCategoryCommand,
  CategoryReadModel
> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(command: CreateCategoryCommand): Promise<CategoryReadModel> {
    const category = await this.categoriesRepository.create({
      userId: command.userId,
      name: command.name.trim(),
      color: command.color,
      icon: command.icon.trim(),
    });

    return toCategoryReadModel(category);
  }
}
