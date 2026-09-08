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

  /** Unchecked input: the handler passes plain `userId`/`categoryId` scalars. */
  create(data: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  findAllForUser(
    userId: string,
    filters: TransactionQueryFilters,
  ): Promise<Transaction[]> {
    const { dateFrom, dateTo, type, categoryId } = filters;

    return this.prisma.transaction.findMany({
      where: {
        userId,
        // Prisma omits any condition whose value is `undefined`, so absent
        // filters need no conditional spreading.
        type,
        categoryId,
        date: dateFrom || dateTo ? { gte: dateFrom, lt: dateTo } : undefined,
      },
      // `date` is user-supplied and collides constantly (a whole day's entries
      // share 00:00:00Z); `createdAt` gives the within-day order a stable tiebreak.
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findByIdForUser(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({ where: { id, userId } });
  }

  update(
    id: string,
    data: Prisma.TransactionUncheckedUpdateInput,
  ): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data });
  }

  delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }

  /** Month totals, one row per type. Postgres does the summing. */
  sumByTypeForUser(userId: string, start: Date, end: Date) {
    return this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });
  }

  /**
   * Month totals per category *and* type — a category used for both income and
   * expense correctly yields two rows. Categories with no transactions in the
   * window produce no row at all.
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
