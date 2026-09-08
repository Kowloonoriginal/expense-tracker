import type { TransactionType } from '@repo/shared';

/**
 * Dates cross the wire as ISO strings (see the note in @repo/shared), so every
 * display goes through here rather than calling Date methods on a string.
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Income reads as a gain, expense as a loss — the sign carries that, not colour alone. */
export function formatSignedAmount(
  value: number,
  type: TransactionType,
  currency: string,
): string {
  const sign = type === 'INCOME' ? '+' : '−';

  return `${sign}${formatAmount(value, currency)}`;
}
