import type { Category } from '@repo/shared';

/**
 * Lets a transaction row resolve its `categoryId` without a second request —
 * the list already has to fetch the categories for its filter anyway.
 */
export function toCategoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((category) => [category.id, category]));
}
