import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionsRepository } from '../transactions.repository';
import { toTransactionReadModel } from '../transaction.mapper';
import { GetTransactionsQuery, TransactionReadModel } from '../contracts';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Exclusive upper bound. `?dateTo=2025-03-31` means "through the 31st", but it
 * parses to 2025-03-31T00:00:00Z — so a date-only bound advances a full day and
 * the repository compares with `lt`. A full timestamp is taken as given.
 */
function toExclusiveEnd(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!DATE_ONLY.test(value)) return parsed;

  return new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
}

@QueryHandler(GetTransactionsQuery)
export class GetTransactionsHandler implements IQueryHandler<
  GetTransactionsQuery,
  TransactionReadModel[]
> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(query: GetTransactionsQuery): Promise<TransactionReadModel[]> {
    const { dateFrom, dateTo, type, categoryId } = query.filters;

    const transactions = await this.transactionsRepository.findAllForUser(
      query.userId,
      {
        // `gte` on 00:00:00Z is already the intended inclusive start.
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: toExclusiveEnd(dateTo),
        type,
        categoryId,
      },
    );

    return transactions.map(toTransactionReadModel);
  }
}
