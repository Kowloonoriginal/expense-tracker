import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Data-access layer for categories. Everything that touches Prisma for the
 * `Category` model lives here — handlers never talk to the ORM directly.
 *
 * Every read is scoped by `userId`: a category belonging to another user comes
 * back as `null`, so ownership is enforced by the query itself rather than by a
 * separate check that could be forgotten.
 */
@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Unchecked input: the handler passes a plain `userId` instead of a nested connect. */
  create(data: Prisma.CategoryUncheckedCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  findAllForUser(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  findByIdForUser(id: string, userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { id, userId } });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }
}
