import type { CategorySummary, TransactionSummary } from '@repo/shared';

/**
 * The shape returned by `GET /transactions/summary`: `month`/`year` echoed
 * back, `income`/`expense`/`balance` totals for that window, and `byCategory`
 * — the per-category breakdown (see {@link CategorySummaryReadModel}).
 */
export type TransactionSummaryReadModel = TransactionSummary;

/**
 * One row of a monthly summary's per-category breakdown: category id, its
 * display metadata (`name`/`color`/`icon`), the transaction `type` it was
 * summed under, and the summed `total`.
 */
export type CategorySummaryReadModel = CategorySummary;
