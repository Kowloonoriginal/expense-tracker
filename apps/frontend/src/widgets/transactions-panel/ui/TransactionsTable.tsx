'use client';

import type { Category, Transaction } from '@repo/shared';
import { TransactionRow } from '@/entities/transaction';
import { CategoryBadge } from '@/entities/category';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/utils';

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: Map<string, Category>;
  currency: string;
  isLoading: boolean;
  /** A refetch over existing rows — dim them rather than collapsing to skeletons. */
  isFetching: boolean;
  rowsPerPage: number;
}

export function TransactionsTable({
  transactions,
  categories,
  currency,
  isLoading,
  isFetching,
  rowsPerPage,
}: TransactionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table
        aria-busy={isFetching}
        className={cn(
          'transition-opacity',
          isFetching && !isLoading && 'opacity-60',
        )}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Опис</TableHead>
            <TableHead>Категорія</TableHead>
            <TableHead className="text-right">Сума</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: rowsPerPage }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : transactions.map((transaction) => {
                const category = categories.get(transaction.categoryId);

                return (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categoryBadge={
                      category && (
                        <CategoryBadge
                          name={category.name}
                          color={category.color}
                        />
                      )
                    }
                    currency={currency}
                  />
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}
