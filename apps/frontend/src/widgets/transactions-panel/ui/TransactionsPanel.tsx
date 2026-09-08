'use client';

import { useState } from 'react';
import type { TransactionFiltersDto } from '@repo/shared';
import { getCategories, toCategoryMap } from '@/entities/category';
import { useSession } from '@/entities/session';
import { TransactionForm } from '@/features/create-transaction';
import { useAsync } from '@/shared/lib/use-async';
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
 * A widget rather than a feature: it must refresh after the create form
 * succeeds, and the list and the form are sibling slices. A widget may import
 * features, so it can own the refresh key itself and keep the route file thin.
 */
export function TransactionsPanel({
  title = 'Транзакції',
  showFilters = false,
  showCreate = false,
}: TransactionsPanelProps) {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFiltersDto>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const categoriesState = useAsync(getCategories, []);
  const categories = categoriesState.data ?? [];
  const { data, error, isLoading, isFetching, total, totalPages } =
    useTransactionsPage(page, filters, refreshKey);

  const transactions = data?.items ?? [];
  const currency = user?.currency ?? 'UAH';
  const hasFilters = Object.values(filters).some(Boolean);

  function applyFilters(next: TransactionFiltersDto) {
    setFilters(next);
    // A narrower result may not have the current page at all.
    setPage(1);
  }

  return (
    <Card>
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
            onCreated={() => {
              setIsFormOpen(false);
              setPage(1);
              setRefreshKey((key) => key + 1);
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
