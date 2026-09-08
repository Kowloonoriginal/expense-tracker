import type { TransactionType } from '@repo/shared';

/**
 * A partial update. `description` is three-way: `undefined` leaves it alone,
 * `null` clears it, a string replaces it.
 */
export class UpdateTransactionCommand {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly amount?: number,
    readonly type?: TransactionType,
    readonly date?: string,
    readonly categoryId?: string,
    readonly description?: string | null,
  ) {}
}
