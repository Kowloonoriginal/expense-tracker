import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../categories.repository';
import { toCategoryReadModel } from '../category.mapper';
import { CategoryReadModel, GetCategoriesQuery } from '../contracts';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<
  GetCategoriesQuery,
  CategoryReadModel[]
> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(query: GetCategoriesQuery): Promise<CategoryReadModel[]> {
    const categories = await this.categoriesRepository.findAllForUser(
      query.userId,
    );

    return categories.map(toCategoryReadModel);
  }
}
