'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category, Transaction } from '@repo/shared';
import { useCreateTransaction, TYPE_LABEL } from '@/entities/transaction';
import { toMessage } from '@/shared/api/error-message';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { SelectField } from '@/shared/ui/select-field';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  createTransactionSchema,
  type CreateTransactionValues,
} from '../model/schema';

interface TransactionFormProps {
  /** Passed in by the parent, which already loaded them for its filter. */
  categories: Category[];
  /**
   * `categories` is `[]` in three different situations — not loaded yet,
   * failed to load, and genuinely empty — and those need three different
   * messages, not one. Without `isLoadingCategories` a user on a slow
   * connection was briefly told to go create a category they already have.
   */
  isLoadingCategories: boolean;
  categoriesError: string | null;
  onCreated: (transaction: Transaction) => void;
}

export function TransactionForm({
  categories,
  isLoadingCategories,
  categoriesError,
  onCreated,
}: TransactionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createTransaction = useCreateTransaction();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  if (isLoadingCategories) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (categoriesError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{categoriesError}</AlertDescription>
      </Alert>
    );
  }

  // A fresh account has no categories, and categoryId is required — so without
  // this the first thing a new user can do is fail.
  if (categories.length === 0) {
    return (
      <Alert className="mb-4">
        <AlertDescription>
          Спочатку створіть категорію —{' '}
          <Link
            href="/categories"
            className="text-primary underline underline-offset-4"
          >
            перейти до категорій
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  async function onSubmit(values: CreateTransactionValues) {
    setServerError(null);
    try {
      const created = await createTransaction.mutateAsync({
        amount: values.amount,
        type: values.type,
        date: values.date,
        categoryId: values.categoryId,
        description: values.description || null,
      });
      reset();
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Сума"
          type="number"
          step="0.01"
          min="0"
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />
        <SelectField
          label="Тип"
          error={errors.type?.message}
          {...register('type')}
        >
          <option value="EXPENSE">{TYPE_LABEL.EXPENSE}</option>
          <option value="INCOME">{TYPE_LABEL.INCOME}</option>
        </SelectField>
        <SelectField
          label="Категорія"
          error={errors.categoryId?.message}
          {...register('categoryId')}
        >
          <option value="">Оберіть категорію</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <FormField
          label="Дата"
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />
      </div>

      <FormField
        label="Опис"
        type="text"
        error={errors.description?.message}
        {...register('description')}
      />

      <Button
        type="submit"
        disabled={isSubmitting}
        className="justify-self-start"
      >
        {isSubmitting ? 'Збереження...' : 'Додати транзакцію'}
      </Button>
    </form>
  );
}
