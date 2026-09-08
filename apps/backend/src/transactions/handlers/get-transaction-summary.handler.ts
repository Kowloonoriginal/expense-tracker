import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { CategoryReadModel, GetCategoriesQuery } from '@/categories/contracts';
import { TransactionsRepository } from '../transactions.repository';
import { toAmount, toBalance } from '../transaction.mapper';
import {
  GetTransactionSummaryQuery,
  TransactionSummaryReadModel,
} from '../contracts';

/**
 * Monthly aggregation.
 *
 * The window is computed in UTC and is half-open, `[start, end)`. Known
 * limitation: "the month" therefore means the UTC month, not the user's local
 * one — a Kyiv transaction at 2025-03-01T00:30+02:00 is 2025-02-28T22:30Z and
 * lands in February. Fixing that needs a per-user timezone, which `User` does
 * not carry.
 */
@QueryHandler(GetTransactionSummaryQuery)
export class GetTransactionSummaryHandler implements IQueryHandler<
  GetTransactionSummaryQuery,
  TransactionSummaryReadModel
> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    query: GetTransactionSummaryQuery,
  ): Promise<TransactionSummaryReadModel> {
    const { userId, month, year } = query;

    // Date.UTC, not new Date(y, m, d): the local constructor would offset the
    // boundary by the server's timezone. December needs no special case —
    // Date.UTC(2025, 12, 1) rolls over to 2026-01-01 on its own.
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [totals, perCategory, categories] = await Promise.all([
      this.transactionsRepository.sumByTypeForUser(userId, start, end),
      this.transactionsRepository.sumByCategoryForUser(userId, start, end),
      // Category metadata belongs to CategoriesModule: it arrives through that
      // module's published contract, never through a join owned by this one.
      this.queryBus.execute<GetCategoriesQuery, CategoryReadModel[]>(
        new GetCategoriesQuery(userId),
      ),
    ]);

    const income =
      totals.find((row) => row.type === 'INCOME')?._sum.amount ?? null;
    const expense =
      totals.find((row) => row.type === 'EXPENSE')?._sum.amount ?? null;
    const byId = new Map(categories.map((category) => [category.id, category]));

    return {
      month,
      year,
      // Totals come from their own groupBy rather than by summing the breakdown,
      // so they stay authoritative even if the category join degrades.
      income: toAmount(income),
      expense: toAmount(expense),
      balance: toBalance(income, expense),
      byCategory: perCategory.map((row) => {
        const category = byId.get(row.categoryId);

        return {
          categoryId: row.categoryId,
          // Unreachable in practice — the FK plus the ownership check at write
          // time guarantee a match — but falling back rather than dropping the
          // row keeps the breakdown summing to the totals above.
          name: category?.name ?? 'Unknown',
          color: category?.color ?? '#9CA3AF',
          icon: category?.icon ?? 'tag',
          type: row.type,
          total: toAmount(row._sum.amount),
        };
      }),
    };
  }
}
