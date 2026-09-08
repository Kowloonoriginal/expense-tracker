import type { TransactionType } from '@repo/shared';

/**
 * `userId` comes from the authenticated request, never from the request body.
 * `amount` stays a number and `date` an ISO string — contracts stay primitive,
 * the handler converts to Prisma.Decimal / Date.
 */
export class CreateTransactionCommand {
  constructor(
    readonly userId: string,
    readonly amount: number,
    readonly type: TransactionType,
    readonly date: string,
    readonly categoryId: string,
    readonly description?: string | null,
  ) {}
}
