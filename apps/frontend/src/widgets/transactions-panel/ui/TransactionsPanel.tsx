'use client';

import { useState } from 'react';
import type { TransactionFiltersDto } from '@repo/shared';
import { useCategories, toCategoryMap } from '@/entities/category';
import { useSession } from '@/entities/session';
import { TransactionForm } from '@/features/create-transaction';
import { toMessage } from '@/shared/api/error-message';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { TransactionsTable } from './TransactionsTable';
import { TransactionsPager } from './TransactionsPager';
import { TransactionFilters } from './TransactionFilters';
import { PAGE_SIZE, useTransactionsPage } from '../model/use-transactions-page';

interface TransactionsPanelProps {
  title?: string;
  showFilters?: boolean;
  showCreate?: boolean;
}

/**
 * A widget rather than a feature: it composes the list with the create form,
 * which are sibling slices, and a widget is the layer allowed to import a
 * feature. The refresh after a create is no longer its job — the mutation
 * invalidates the transaction keys — but keeping the composition here still
 * keeps the route file thin.
 */
export function TransactionsPanel({
  title = 'Транзакції',
  showFilters = false,
  showCreate = false,
}: TransactionsPanelProps) {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFiltersDto>({});
  const [isFormOpen, setIsFormOpen] = useState(false);

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];
  const { transactions, error, isLoading, isFetching, total, totalPages } =
    useTransactionsPage(page, filters);

  const currency = user?.currency ?? 'UAH';
  const hasFilters = Object.values(filters).some(Boolean);

  function applyFilters(next: TransactionFiltersDto) {
    setFilters(next);
    // A narrower result may not have the current page at all.
    setPage(1);
  }

  return (
    <Card className="paper">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        {showCreate && (
          <Button
            variant={isFormOpen ? 'ghost' : 'default'}
            size="sm"
            onClick={() => setIsFormOpen((open) => !open)}
          >
            {isFormOpen ? 'Скасувати' : 'Додати'}
          </Button>
        )}
      </CardHeader>

      <CardContent className="grid gap-4">
        {showCreate && isFormOpen && (
          <TransactionForm
            categories={categories}
            isLoadingCategories={categoriesQuery.isLoading}
            categoriesError={
              categoriesQuery.error ? toMessage(categoriesQuery.error) : null
            }
            onCreated={() => {
              setIsFormOpen(false);
              // The list refetches itself through invalidation; page 1 is where
              // the new transaction will be.
              setPage(1);
            }}
          />
        )}

        {showFilters && (
          <TransactionFilters
            filters={filters}
            categories={categories}
            onChange={applyFilters}
          />
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !isLoading && transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {hasFilters
              ? 'За цими фільтрами нічого не знайдено.'
              : 'Транзакцій ще немає — додайте першу.'}
          </p>
        ) : (
          <>
            <TransactionsTable
              transactions={transactions}
              categories={toCategoryMap(categories)}
              currency={currency}
              isLoading={isLoading}
              isFetching={isFetching}
              rowsPerPage={PAGE_SIZE}
            />
            {totalPages > 1 && (
              <TransactionsPager
                page={page}
                totalPages={totalPages}
                total={total}
                onChange={setPage}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
