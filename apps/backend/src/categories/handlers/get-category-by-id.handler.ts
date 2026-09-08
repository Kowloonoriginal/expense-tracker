import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../categories.repository';
import { toCategoryReadModel } from '../category.mapper';
import { CategoryReadModel, GetCategoryByIdQuery } from '../contracts';

/**
 * Returns null rather than throwing: the caller is another module deciding what
 * a missing category means for *its* use case, so the HTTP status is not this
 * module's to pick. Mirrors GetUserByIdHandler.
 */
@QueryHandler(GetCategoryByIdQuery)
export class GetCategoryByIdHandler implements IQueryHandler<
  GetCategoryByIdQuery,
  CategoryReadModel | null
> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(
    query: GetCategoryByIdQuery,
  ): Promise<CategoryReadModel | null> {
    const category = await this.categoriesRepository.findByIdForUser(
      query.id,
      query.userId,
    );

    return category ? toCategoryReadModel(category) : null;
  }
}
