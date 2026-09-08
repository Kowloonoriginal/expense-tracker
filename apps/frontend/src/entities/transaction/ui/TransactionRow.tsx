import type { Category, Transaction } from '@repo/shared';
import { CategoryBadge } from '@/entities/category';
import { TableCell, TableRow } from '@/shared/ui/table';
import { formatDate } from '@/shared/lib/format';
import { TransactionAmount } from './TransactionAmount';

interface TransactionRowProps {
  transaction: Transaction;
  /** Passed in, never fetched — the list already loaded the categories. */
  category?: Category;
  currency: string;
}

export function TransactionRow({
  transaction,
  category,
  currency,
}: TransactionRowProps) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDate(transaction.date)}
      </TableCell>
      <TableCell>
        {transaction.description || (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {category ? (
          <CategoryBadge name={category.name} color={category.color} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <TransactionAmount
          amount={transaction.amount}
          type={transaction.type}
          currency={currency}
        />
      </TableCell>
    </TableRow>
  );
}
