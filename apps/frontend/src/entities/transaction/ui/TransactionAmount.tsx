import type { TransactionType } from '@repo/shared';
import { formatSignedAmount } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

interface TransactionAmountProps {
  amount: number;
  type: TransactionType;
  currency: string;
  className?: string;
}

export function TransactionAmount({
  amount,
  type,
  currency,
  className,
}: TransactionAmountProps) {
  return (
    <span
      className={cn(
        'font-medium tabular-nums',
        // The sign carries the meaning on its own; colour only reinforces it.
        type === 'INCOME' ? 'text-income' : 'text-foreground',
        className,
      )}
    >
      {formatSignedAmount(amount, type, currency)}
    </span>
  );
}
