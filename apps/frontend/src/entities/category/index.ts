/**
 * Public surface of the category entity. The raw `categories-api` functions
 * stay internal — other layers read through the query hooks so every caller
 * shares one cache and one invalidation rule.
 */
export {
  useCategories,
  useCreateCategory,
  categoryKeys,
} from './api/category-queries';
export { toCategoryMap } from './model/category-map';
export { CategoryBadge } from './ui/CategoryBadge';
