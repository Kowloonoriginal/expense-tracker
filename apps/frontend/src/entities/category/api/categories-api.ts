import type { Category, CreateCategoryDto } from '@repo/shared';
import { apiFetch } from '@/shared/api/client';

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories');
}

export function createCategory(dto: CreateCategoryDto): Promise<Category> {
  return apiFetch<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}
