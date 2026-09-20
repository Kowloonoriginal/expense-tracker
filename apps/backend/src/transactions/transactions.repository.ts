import { Injectable } from '@nestjs/common';
import { Prisma, Transaction, TransactionType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/** Date bounds already resolved by the handler; the range is half-open [from, to). */
export interface TransactionQueryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  type?: TransactionType;
  categoryId?: string;
}

/**
 * Data-access layer for transactions. Everything that touches Prisma for the
 * `Transaction` model lives here — handlers never talk to the ORM directly.
 *
 * Every read is scoped by `userId`, so a transaction belonging to another user
 * comes back as `null`/absent: ownership is enforced by the query itself.
 *
 * This repository never reads `prisma.category` and never uses
 * `include: { category }` — category metadata belongs to CategoriesModule and
 * is fetched through its contracts (see GetTransactionSummaryHandler).
 */
@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserts a new transaction row.
   *
   * Unchecked input: the handler passes plain `userId`/`categoryId` scalars.
   *
   * @param data - Full row to insert (Prisma "unchecked" shape).
   * @returns The created transaction.
   * @throws {Prisma.PrismaClientKnownRequestError} `categoryId` or `userId`
   *   violates the foreign-key constraint — the caller (`CreateTransactionHandler`)
   *   already checked category ownership, so this only fires on a stale id
   *   raced against a concurrent delete; caught by the global
   *   `PrismaClientExceptionFilter`.
   */
  create(data: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  /**
   * Fetches one page of a user's transactions plus the total under the *same*
   * `where`.
   *
   * Both statements go through a single `$transaction` and share one `where`
   * object: if the count and the page were separate round trips, a concurrent
   * insert between them would produce a total that describes a different set of
   * rows than the page, and the pager would point at a page that never existed.
   *
   * @param userId - Owner to scope the query to.
   * @param filters - Optional date range, type and category filters; a filter
   *   left `undefined` is omitted from the `where` clause entirely.
   * @param page - `skip`/`take` pair already resolved from page/limit.
   * @returns `items` — the page's rows, ordered newest first — and `total`,
   *   the row count across all pages under the same filters.
   */
  async findPageForUser(
    userId: string,
    filters: TransactionQueryFilters,
    page: { skip: number; take: number },
  ): Promise<{ items: Transaction[]; total: number }> {
    const { dateFrom, dateTo, type, categoryId } = filters;

    const where: Prisma.TransactionWhereInput = {
      userId,
      // Prisma omits any condition whose value is `undefined`, so absent
      // filters need no conditional spreading.
      type,
      categoryId,
      date: dateFrom || dateTo ? { gte: dateFrom, lt: dateTo } : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        // `date` is user-supplied and collides constantly (a whole day's entries
        // share 00:00:00Z); `createdAt` gives the within-day order a stable
        // tiebreak — and a total order is what makes skip/take coherent at all.
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Finds one transaction, scoped to its owner.
   *
   * Ownership is enforced by the query itself: a transaction belonging to
   * another user simply does not match and comes back as `null`, so the
   * caller can turn that into a 404 without a separate ownership check.
   *
   * @param id - Transaction id.
   * @param userId - Owner to scope the lookup to.
   * @returns The transaction, or `null` if no row matches both `id` and
   *   `userId`.
   */
  findByIdForUser(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({ where: { id, userId } });
  }

  /**
   * Updates a transaction by id.
   *
   * Not scoped by `userId` — the caller must already have confirmed ownership
   * via {@link findByIdForUser} before calling this.
   *
   * @param id - Transaction id.
   * @param data - Fields to change; a field left `undefined` is left
   *   untouched by Prisma, so a partial PATCH only writes what it sent.
   * @returns The updated transaction.
   * @throws {Prisma.PrismaClientKnownRequestError} `id` does not exist (code
   *   `P2025`), or `data.categoryId` violates the foreign-key constraint —
   *   caught by the global `PrismaClientExceptionFilter`.
   */
  update(
    id: string,
    data: Prisma.TransactionUncheckedUpdateInput,
  ): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data });
  }

  /**
   * Deletes a transaction by id.
   *
   * Not scoped by `userId` — the caller must already have confirmed ownership
   * via {@link findByIdForUser} before calling this.
   *
   * @param id - Transaction id.
   * @returns The deleted transaction.
   * @throws {Prisma.PrismaClientKnownRequestError} `id` does not exist (code
   *   `P2025`) — caught by the global `PrismaClientExceptionFilter`.
   */
  delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Sums a user's transactions by type over a date window. Postgres does the
   * summing.
   *
   * @param userId - Owner to scope the query to.
   * @param start - Inclusive start of the window.
   * @param end - Exclusive end of the window.
   * @returns One row per `type` present in the window, each with its summed
   *   `amount`; a type with no transactions in the window produces no row.
   */
  sumByTypeForUser(userId: string, start: Date, end: Date) {
    return this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });
  }

  /**
   * Sums a user's transactions by category *and* type over a date window — a
   * category used for both income and expense correctly yields two rows.
   *
   * @param userId - Owner to scope the query to.
   * @param start - Inclusive start of the window.
   * @param end - Exclusive end of the window.
   * @returns One row per `(categoryId, type)` pair present in the window,
   *   ordered by summed `amount` descending; categories with no transactions
   *   in the window produce no row.
   */
  sumByCategoryForUser(userId: string, start: Date, end: Date) {
    return this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
  }
}
