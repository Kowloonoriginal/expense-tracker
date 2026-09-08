import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp, uniqueEmail } from './utils/test-app';

const PASSWORD = 'password123';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Two separate accounts: everything about ownership needs a second user.
  let token: string;
  let otherToken: string;
  let userId: string;
  let categoryId: string;
  let otherCategoryId: string;

  const auth = (accessToken: string) => `Bearer ${accessToken}`;

  const registerUser = async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail(), name: 'Test User', password: PASSWORD });

    return {
      token: res.body.accessToken as string,
      id: res.body.user.id as string,
    };
  };

  const createCategory = async (accessToken: string, name: string) => {
    const res = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', auth(accessToken))
      .send({ name, color: '#4ADE80', icon: 'tag' });

    return res.body.id as string;
  };

  const createTransaction = (
    accessToken: string,
    body: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', auth(accessToken))
      .send(body);

  const validBody = (overrides: Record<string, unknown> = {}) => ({
    amount: 1000.5,
    type: 'EXPENSE',
    date: '2025-03-15T10:00:00.000Z',
    categoryId,
    ...overrides,
  });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');

    ({ token, id: userId } = await registerUser());
    ({ token: otherToken } = await registerUser());

    categoryId = await createCategory(token, 'Groceries');
    otherCategoryId = await createCategory(otherToken, 'Private');
  });

  afterEach(async () => {
    // Each test seeds its own fixtures; wiping between them keeps list/summary
    // assertions independent of execution order.
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "transactions" CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CRUD', () => {
    it('creates a transaction for the current user', async () => {
      const res = await createTransaction(token, validBody());

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        amount: 1000.5,
        type: 'EXPENSE',
        categoryId,
        userId,
        description: null,
      });
      // Guards the whole Decimal decision: Prisma's Decimal.toJSON() would emit
      // a string, so this is what pins the API to numbers.
      expect(typeof res.body.amount).toBe('number');
    });

    it('returns a single transaction and 404s for an unknown id', async () => {
      const created = await createTransaction(token, validBody());

      const found = await request(app.getHttpServer())
        .get(`/transactions/${created.body.id}`)
        .set('Authorization', auth(token));
      const missing = await request(app.getHttpServer())
        .get('/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', auth(token));

      expect(found.status).toBe(200);
      expect(found.body.id).toBe(created.body.id);
      expect(missing.status).toBe(404);
    });

    it('applies a partial update and leaves the other fields untouched', async () => {
      const created = await createTransaction(
        token,
        validBody({ description: 'Weekly shop' }),
      );

      const res = await request(app.getHttpServer())
        .patch(`/transactions/${created.body.id}`)
        .set('Authorization', auth(token))
        .send({ amount: 42.25 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: created.body.id,
        amount: 42.25,
        type: 'EXPENSE',
        description: 'Weekly shop',
        categoryId,
      });
    });

    it('clears the description when null is sent explicitly', async () => {
      const created = await createTransaction(
        token,
        validBody({ description: 'To be cleared' }),
      );

      const res = await request(app.getHttpServer())
        .patch(`/transactions/${created.body.id}`)
        .set('Authorization', auth(token))
        .send({ description: null });

      expect(res.status).toBe(200);
      expect(res.body.description).toBeNull();
    });

    it('deletes a transaction and drops it from the list', async () => {
      const created = await createTransaction(token, validBody());

      const deleted = await request(app.getHttpServer())
        .delete(`/transactions/${created.body.id}`)
        .set('Authorization', auth(token));

      expect(deleted.status).toBe(204);

      const list = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', auth(token));

      expect(list.body.items).toHaveLength(0);
      expect(list.body.total).toBe(0);
    });
  });

  describe('validation', () => {
    it('rejects invalid bodies with 400', async () => {
      const negative = await createTransaction(
        token,
        validBody({ amount: -5 }),
      );
      const tooPrecise = await createTransaction(
        token,
        validBody({ amount: 10.123 }),
      );
      const badType = await createTransaction(
        token,
        validBody({ type: 'TRANSFER' }),
      );
      const badDate = await createTransaction(
        token,
        validBody({ date: 'not-a-date' }),
      );
      const badCategory = await createTransaction(
        token,
        validBody({ categoryId: 'not-a-uuid' }),
      );

      expect([
        negative.status,
        tooPrecise.status,
        badType.status,
        badDate.status,
        badCategory.status,
      ]).toEqual([400, 400, 400, 400, 400]);
    });

    it('strips unknown body fields, so ownership still comes from the token', async () => {
      const res = await createTransaction(
        token,
        validBody({ userId: 'someone-else' }),
      );

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(userId);
    });
  });

  describe('cross-user isolation', () => {
    it("lists only the current user's transactions", async () => {
      await createTransaction(token, validBody());
      await createTransaction(
        otherToken,
        validBody({ categoryId: otherCategoryId }),
      );

      const res = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', auth(token));

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].userId).toBe(userId);
    });

    it("returns an identical 404 for another user's transaction and an unknown id", async () => {
      const theirs = await createTransaction(
        otherToken,
        validBody({ categoryId: otherCategoryId }),
      );
      const unknownId = '00000000-0000-0000-0000-000000000000';

      const foreignGet = await request(app.getHttpServer())
        .get(`/transactions/${theirs.body.id}`)
        .set('Authorization', auth(token));
      const unknownGet = await request(app.getHttpServer())
        .get(`/transactions/${unknownId}`)
        .set('Authorization', auth(token));
      const foreignPatch = await request(app.getHttpServer())
        .patch(`/transactions/${theirs.body.id}`)
        .set('Authorization', auth(token))
        .send({ amount: 1 });
      const foreignDelete = await request(app.getHttpServer())
        .delete(`/transactions/${theirs.body.id}`)
        .set('Authorization', auth(token));

      expect([
        foreignGet.status,
        unknownGet.status,
        foreignPatch.status,
        foreignDelete.status,
      ]).toEqual([404, 404, 404, 404]);
      // The response must not reveal that somebody else's transaction exists.
      expect(foreignGet.body.message).toBe(unknownGet.body.message);

      // And it survived the attempts.
      const stillThere = await request(app.getHttpServer())
        .get(`/transactions/${theirs.body.id}`)
        .set('Authorization', auth(otherToken));

      expect(stillThere.status).toBe(200);
    });

    it("rejects another user's categoryId with the same 404 categories uses", async () => {
      const onCreate = await createTransaction(
        token,
        validBody({ categoryId: otherCategoryId }),
      );

      const mine = await createTransaction(token, validBody());
      const onUpdate = await request(app.getHttpServer())
        .patch(`/transactions/${mine.body.id}`)
        .set('Authorization', auth(token))
        .send({ categoryId: otherCategoryId });

      // Byte-identical to what PATCH /categories/:id already returns, so no new
      // existence oracle is introduced.
      const viaCategories = await request(app.getHttpServer())
        .patch(`/categories/${otherCategoryId}`)
        .set('Authorization', auth(token))
        .send({ name: 'Hijacked' });

      expect(onCreate.status).toBe(404);
      expect(onUpdate.status).toBe(404);
      expect(onCreate.body.message).toBe('Category not found');
      expect(onCreate.body.message).toBe(viaCategories.body.message);
    });
  });

  describe('filters', () => {
    const seed = () =>
      prisma.transaction.createMany({
        data: [
          {
            userId,
            categoryId,
            type: 'EXPENSE',
            amount: 10,
            date: new Date('2025-03-01T00:00:00.000Z'),
          },
          {
            userId,
            categoryId,
            type: 'INCOME',
            amount: 20,
            date: new Date('2025-03-15T12:00:00.000Z'),
          },
          {
            userId,
            categoryId,
            type: 'EXPENSE',
            amount: 30,
            // Late in the day: the date-only `dateTo` bound must still include it.
            date: new Date('2025-03-31T18:00:00.000Z'),
          },
          {
            userId,
            categoryId,
            type: 'EXPENSE',
            amount: 40,
            date: new Date('2025-04-05T00:00:00.000Z'),
          },
        ],
      });

    const list = (queryString: string) =>
      request(app.getHttpServer())
        .get(`/transactions${queryString}`)
        .set('Authorization', auth(token));

    it('filters by date range, type and category', async () => {
      await seed();

      const all = await list('');
      const from = await list('?dateFrom=2025-03-15');
      const to = await list('?dateTo=2025-03-31');
      const income = await list('?type=INCOME');
      const byCategory = await list(`?categoryId=${categoryId}`);
      const combined = await list(
        '?dateFrom=2025-03-01&dateTo=2025-03-14&type=EXPENSE',
      );

      expect(all.body.items).toHaveLength(4);
      expect(all.body.total).toBe(4);
      // Newest first.
      expect(all.body.items[0].amount).toBe(40);

      expect(
        from.body.items.map((t: { amount: number }) => t.amount).sort(),
      ).toEqual([20, 30, 40]);
      // The date-only upper bound covers all of the 31st, including 18:00.
      expect(
        to.body.items.map((t: { amount: number }) => t.amount).sort(),
      ).toEqual([10, 20, 30]);
      expect(income.body.items).toHaveLength(1);
      expect(byCategory.body.items).toHaveLength(4);
      expect(combined.body.items).toHaveLength(1);
      expect(combined.body.items[0].amount).toBe(10);
    });
  });

  describe('pagination', () => {
    /** 12 rows on distinct days, so `date desc` gives a deterministic order. */
    const seedTwelve = () =>
      prisma.transaction.createMany({
        data: Array.from({ length: 12 }, (_, index) => ({
          userId,
          categoryId,
          type: index < 4 ? ('INCOME' as const) : ('EXPENSE' as const),
          amount: index + 1,
          date: new Date(
            `2025-05-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
          ),
        })),
      });

    const list = (queryString: string) =>
      request(app.getHttpServer())
        .get(`/transactions${queryString}`)
        .set('Authorization', auth(token));

    it('defaults to page 1 with 10 per page', async () => {
      await seedTwelve();

      const res = await list('');

      // Also proves the DTO's field initializers survive plainToInstance.
      expect(res.body.items).toHaveLength(10);
      expect(res.body.total).toBe(12);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('serves the tail on the last page without overlapping', async () => {
      await seedTwelve();

      const first = await list('?page=1');
      const second = await list('?page=2');

      expect(second.body.items).toHaveLength(2);
      expect(second.body.page).toBe(2);

      const ids = [...first.body.items, ...second.body.items].map(
        (t: { id: string }) => t.id,
      );
      expect(new Set(ids).size).toBe(12);
    });

    it('returns an empty page past the end rather than a 404', async () => {
      await seedTwelve();

      const res = await list('?page=99');

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(12);
      // Echoed as asked, not clamped.
      expect(res.body.page).toBe(99);
    });

    it('honours an explicit limit', async () => {
      await seedTwelve();

      const res = await list('?limit=5');

      expect(res.body.items).toHaveLength(5);
      expect(res.body.total).toBe(12);
      expect(res.body.limit).toBe(5);
    });

    it('counts the filtered set, not the whole table', async () => {
      await seedTwelve();

      const res = await list('?type=INCOME&limit=2');

      expect(res.body.items).toHaveLength(2);
      // 4 INCOME rows were seeded; the count must share the page's `where`.
      expect(res.body.total).toBe(4);
    });

    it('rejects out-of-range paging with 400', async () => {
      const zeroPage = await list('?page=0');
      const zeroLimit = await list('?limit=0');
      const overLimit = await list('?limit=101');
      const notANumber = await list('?page=abc');

      expect([
        zeroPage.status,
        zeroLimit.status,
        overLimit.status,
        notANumber.status,
      ]).toEqual([400, 400, 400, 400]);
    });
  });

  describe('summary', () => {
    const summary = (queryString: string, accessToken = token) =>
      request(app.getHttpServer())
        .get(`/transactions/summary${queryString}`)
        .set('Authorization', auth(accessToken));

    it('is not swallowed by the :id route', async () => {
      const res = await summary('?month=3&year=2025');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('byCategory');
    });

    it('sums the month in Decimal, not float', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId,
            categoryId,
            type: 'INCOME',
            amount: 1000.1,
            date: new Date('2025-03-10T00:00:00.000Z'),
          },
          {
            userId,
            categoryId,
            type: 'EXPENSE',
            amount: 999.99,
            date: new Date('2025-03-20T00:00:00.000Z'),
          },
        ],
      });

      const res = await summary('?month=3&year=2025');

      expect(res.body).toMatchObject({
        month: 3,
        year: 2025,
        income: 1000.1,
        expense: 999.99,
        // In float this would be 0.10999999999994.
        balance: 0.11,
      });
    });

    it('includes the first instant of the month and excludes the next', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId,
            categoryId,
            type: 'INCOME',
            amount: 5,
            date: new Date('2025-03-01T00:00:00.000Z'),
          },
          {
            userId,
            categoryId,
            type: 'INCOME',
            amount: 7,
            date: new Date('2025-04-01T00:00:00.000Z'),
          },
        ],
      });

      const res = await summary('?month=3&year=2025');

      expect(res.body.income).toBe(5);
    });

    it('rolls December over into the next year', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId,
            categoryId,
            type: 'INCOME',
            amount: 11,
            date: new Date('2025-12-31T23:00:00.000Z'),
          },
          {
            userId,
            categoryId,
            type: 'INCOME',
            amount: 13,
            date: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      });

      const res = await summary('?month=12&year=2025');

      expect(res.body.income).toBe(11);
    });

    it('breaks down by category and type, and excludes other users', async () => {
      const second = await createCategory(token, 'Salary');
      await prisma.transaction.createMany({
        data: [
          {
            userId,
            categoryId,
            type: 'EXPENSE',
            amount: 100,
            date: new Date('2025-03-05T00:00:00.000Z'),
          },
          {
            // Same category, other type — must produce its own row.
            userId,
            categoryId,
            type: 'INCOME',
            amount: 25,
            date: new Date('2025-03-06T00:00:00.000Z'),
          },
          {
            userId,
            categoryId: second,
            type: 'INCOME',
            amount: 500,
            date: new Date('2025-03-07T00:00:00.000Z'),
          },
        ],
      });
      await createTransaction(
        otherToken,
        validBody({ categoryId: otherCategoryId, amount: 999 }),
      );

      const res = await summary('?month=3&year=2025');

      expect(res.body.byCategory).toHaveLength(3);
      expect(res.body.expense).toBe(100);
      expect(res.body.income).toBe(525);

      const groceriesExpense = res.body.byCategory.find(
        (row: { categoryId: string; type: string }) =>
          row.categoryId === categoryId && row.type === 'EXPENSE',
      );

      expect(groceriesExpense).toMatchObject({
        name: 'Groceries',
        color: '#4ADE80',
        icon: 'tag',
        total: 100,
      });
      // The other user's 999 never appears.
      expect(
        res.body.byCategory.some(
          (row: { categoryId: string }) => row.categoryId === otherCategoryId,
        ),
      ).toBe(false);
    });

    it('returns zeroes for a month with no transactions', async () => {
      const res = await summary('?month=7&year=2025');

      expect(res.body).toMatchObject({
        income: 0,
        expense: 0,
        balance: 0,
        byCategory: [],
      });
    });

    it('requires both month and year', async () => {
      const noYear = await summary('?month=3');
      const noMonth = await summary('?year=2025');
      const neither = await summary('');
      const zero = await summary('?month=0&year=2025');
      const thirteen = await summary('?month=13&year=2025');
      const notANumber = await summary('?month=abc&year=2025');

      expect([
        noYear.status,
        noMonth.status,
        neither.status,
        zero.status,
        thirteen.status,
        notANumber.status,
      ]).toEqual([400, 400, 400, 400, 400, 400]);
    });
  });

  it('rejects every route without a token', async () => {
    const server = app.getHttpServer();
    const someId = '00000000-0000-0000-0000-000000000000';

    // Sequential on purpose: supertest opens a socket per call, and firing them
    // at once against the same ephemeral server resets the connections.
    const create = await request(server)
      .post('/transactions')
      .send(validBody());
    const list = await request(server).get('/transactions');
    const summary = await request(server).get(
      '/transactions/summary?month=3&year=2025',
    );
    const findOne = await request(server).get(`/transactions/${someId}`);
    const update = await request(server)
      .patch(`/transactions/${someId}`)
      .send({ amount: 1 });
    const remove = await request(server).delete(`/transactions/${someId}`);

    expect([
      create.status,
      list.status,
      summary.status,
      findOne.status,
      update.status,
      remove.status,
    ]).toEqual([401, 401, 401, 401, 401, 401]);
  });
});
