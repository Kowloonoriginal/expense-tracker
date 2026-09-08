import { Category } from '@prisma/client';
import { CategoryReadModel } from './contracts';

/** Maps the Prisma entity onto the shape shared with the frontend. */
export function toCategoryReadModel(category: Category): CategoryReadModel {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    userId: category.userId,
  };
}
