import type { TransactionType } from '@repo/shared';

export const TYPE_LABEL: Record<TransactionType, string> = {
  INCOME: 'Дохід',
  EXPENSE: 'Витрата',
};
