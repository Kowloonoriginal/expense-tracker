import type { ReactNode } from 'react';
import type { Transaction } from '@repo/shared';
import { TableCell, TableRow } from '@/shared/ui/table';
import { formatDate } from '@/shared/lib/format';
import { TransactionAmount } from './TransactionAmount';

interface TransactionRowProps {
  transaction: Transaction;
  /**
   * Rendered as-is, not resolved here — an entity may not reach sideways into
   * another entity (`entities/category`) just to render its badge. The
   * widget composing this row owns both entities and builds the badge.
   */
  categoryBadge?: ReactNode;
  currency: string;
}

export function TransactionRow({
  transaction,
  categoryBadge,
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
        {categoryBadge ?? <span className="text-muted-foreground">—</span>}
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
