'use client';

import { useState } from 'react';
import { CategoryBadge, useCategories } from '@/entities/category';
import { CategoryForm } from '@/features/create-category';
import { toMessage } from '@/shared/api/error-message';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

export function CategoriesPanel() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data, error, isLoading } = useCategories();
  const categories = data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Категорії</CardTitle>
        <Button
          variant={isFormOpen ? 'ghost' : 'default'}
          size="sm"
          onClick={() => setIsFormOpen((open) => !open)}
        >
          {isFormOpen ? 'Скасувати' : 'Додати'}
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4">
        {isFormOpen && (
          <CategoryForm
            // The list refetches itself — useCreateCategory invalidates it.
            onCreated={() => setIsFormOpen(false)}
          />
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{toMessage(error)}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Категорій ще немає — створіть першу, щоб почати вести облік.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li
                key={category.id}
                className="rounded-lg border px-3 py-2.5 text-sm"
              >
                <CategoryBadge name={category.name} color={category.color} />
                <span className="ml-2 text-muted-foreground">
                  {category.icon}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
