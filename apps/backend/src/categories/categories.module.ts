import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryHandler } from './handlers/create-category.handler';
import { GetCategoriesHandler } from './handlers/get-categories.handler';
import { GetCategoryByIdHandler } from './handlers/get-category-by-id.handler';
import { UpdateCategoryHandler } from './handlers/update-category.handler';
import { RemoveCategoryHandler } from './handlers/remove-category.handler';

const handlers = [
  CreateCategoryHandler,
  GetCategoriesHandler,
  GetCategoryByIdHandler,
  UpdateCategoryHandler,
  RemoveCategoryHandler,
];

/**
 * Exports nothing: other modules reach this one through the buses, using the
 * classes in ./contracts. CqrsModule.forRoot() in AppModule makes the buses
 * available here without a local import.
 */
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesRepository, ...handlers],
})
export class CategoriesModule {}
