'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category } from '@repo/shared';
import { createCategory } from '@/entities/category';
import { toMessage } from '@/shared/api/error-message';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import {
  createCategorySchema,
  type CreateCategoryValues,
} from '../model/schema';

export function CategoryForm({
  onCreated,
}: {
  onCreated: (category: Category) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { color: '#4ADE80', icon: 'tag' },
  });

  async function onSubmit(values: CreateCategoryValues) {
    setServerError(null);
    try {
      const created = await createCategory(values);
      reset({ color: '#4ADE80', icon: 'tag' });
      onCreated(created);
    } catch (err) {
      setServerError(toMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Назва"
          type="text"
          error={errors.name?.message}
          {...register('name')}
        />
        {/* type="color" always yields a valid #rrggbb, which is exactly what the
            backend's regex expects. */}
        <FormField
          label="Колір"
          type="color"
          className="h-8 p-1"
          error={errors.color?.message}
          {...register('color')}
        />
        <FormField
          label="Іконка"
          type="text"
          error={errors.icon?.message}
          {...register('icon')}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="justify-self-start"
      >
        {isSubmitting ? 'Збереження...' : 'Додати категорію'}
      </Button>
    </form>
  );
}
