'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Category, CreateCategoryDto } from '@repo/shared';
import { createCategory, getCategories } from './categories-api';

/**
 * Every key starts with `all`, so one `invalidateQueries({ queryKey:
 * categoryKeys.all })` covers the list and anything added later.
 */
export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: getCategories,
  });
}

export function useCreateCategory(): UseMutationResult<
  Category,
  Error,
  CreateCategoryDto
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
