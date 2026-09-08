import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionsRepository } from '../transactions.repository';
import { toTransactionReadModel } from '../transaction.mapper';
import {
  GetTransactionsQuery,
  PaginatedTransactionsReadModel,
} from '../contracts';

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
  PaginatedTransactionsReadModel
> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(
    query: GetTransactionsQuery,
  ): Promise<PaginatedTransactionsReadModel> {
    const { dateFrom, dateTo, type, categoryId } = query.filters;
    const { page, limit } = query.pagination;

    const { items, total } = await this.transactionsRepository.findPageForUser(
      query.userId,
      {
        // `gte` on 00:00:00Z is already the intended inclusive start.
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: toExclusiveEnd(dateTo),
        type,
        categoryId,
      },
      { skip: (page - 1) * limit, take: limit },
    );

    // `page` is echoed as asked rather than clamped: a request for page 99 of 3
    // gets an empty list with the real total, and the client can see for itself
    // that it overshot. Clamping would answer a question nobody asked.
    return { items: items.map(toTransactionReadModel), total, page, limit };
  }
}
