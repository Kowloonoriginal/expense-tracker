import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp, uniqueEmail } from './utils/test-app';

const PASSWORD = 'password123';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Two separate accounts: everything about ownership needs a second user.
  let token: string;
  let otherToken: string;

  const auth = (accessToken: string) => `Bearer ${accessToken}`;

  const createCategory = (accessToken: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', auth(accessToken))
      .send(body);

  const registerUser = async (): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail(), name: 'Test User', password: PASSWORD });

    return res.body.accessToken;
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');

    token = await registerUser();
    otherToken = await registerUser();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a category for the current user', async () => {
    const res = await createCategory(token, {
      name: 'Groceries',
      color: '#4ADE80',
      icon: 'shopping-cart',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Groceries',
      color: '#4ADE80',
      icon: 'shopping-cart',
    });
    expect(typeof res.body.id).toBe('string');
  });

  it('rejects an invalid body with 400 and strips unknown fields', async () => {
    const missingIcon = await createCategory(token, {
      name: 'No icon',
      color: '#4ADE80',
    });
    const badColor = await createCategory(token, {
      name: 'Bad color',
      color: 'green',
      icon: 'tag',
    });

    expect(missingIcon.status).toBe(400);
    expect(badColor.status).toBe(400);

    const withExtras = await createCategory(token, {
      name: 'Extras',
      color: '#4ADE80',
      icon: 'tag',
      userId: 'someone-else',
    });

    expect(withExtras.status).toBe(201);
    // whitelist:true drops userId, so ownership still comes from the token.
    expect(withExtras.body.userId).not.toBe('someone-else');
  });

  it("lists only the current user's categories", async () => {
    await createCategory(token, {
      name: 'Mine',
      color: '#4ADE80',
      icon: 'tag',
    });
    await createCategory(otherToken, {
      name: 'Theirs',
      color: '#F87171',
      icon: 'tag',
    });

    const res = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', auth(token));

    expect(res.status).toBe(200);
    expect(res.body.map((c: { name: string }) => c.name)).toContain('Mine');
    expect(res.body.map((c: { name: string }) => c.name)).not.toContain(
      'Theirs',
    );
  });

  it('applies a partial update and leaves the other fields untouched', async () => {
    const created = await createCategory(token, {
      name: 'Transport',
      color: '#4ADE80',
      icon: 'bus',
    });

    const res = await request(app.getHttpServer())
      .patch(`/categories/${created.body.id}`)
      .set('Authorization', auth(token))
      .send({ color: '#F87171' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      name: 'Transport',
      color: '#F87171',
      icon: 'bus',
    });
  });

  it('deletes a category and drops it from the list', async () => {
    const created = await createCategory(token, {
      name: 'Temporary',
      color: '#4ADE80',
      icon: 'tag',
    });

    const deleted = await request(app.getHttpServer())
      .delete(`/categories/${created.body.id}`)
      .set('Authorization', auth(token));

    expect(deleted.status).toBe(204);

    const list = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', auth(token));

    expect(
      list.body.some((c: { id: string }) => c.id === created.body.id),
    ).toBe(false);
  });

  it("returns an identical 404 for another user's category and an unknown id", async () => {
    const theirs = await createCategory(otherToken, {
      name: 'Private',
      color: '#F87171',
      icon: 'lock',
    });

    const foreignUpdate = await request(app.getHttpServer())
      .patch(`/categories/${theirs.body.id}`)
      .set('Authorization', auth(token))
      .send({ name: 'Hijacked' });

    const unknownUpdate = await request(app.getHttpServer())
      .patch('/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', auth(token))
      .send({ name: 'Hijacked' });

    const foreignDelete = await request(app.getHttpServer())
      .delete(`/categories/${theirs.body.id}`)
      .set('Authorization', auth(token));

    expect(foreignUpdate.status).toBe(404);
    expect(unknownUpdate.status).toBe(404);
    expect(foreignDelete.status).toBe(404);
    // Identical bodies: the response must not reveal that the category exists.
    expect(foreignUpdate.body.message).toBe(unknownUpdate.body.message);

    // And the category itself survived the attempts.
    const stillThere = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', auth(otherToken));

    expect(
      stillThere.body.some((c: { id: string }) => c.id === theirs.body.id),
    ).toBe(true);
  });

  it('rejects every route without a token', async () => {
    const server = app.getHttpServer();

    // Sequential on purpose: supertest opens a socket per call, and firing them
    // at once against the same ephemeral server resets the connections.
    const list = await request(server).get('/categories');
    const create = await request(server)
      .post('/categories')
      .send({ name: 'X', color: '#4ADE80', icon: 'tag' });
    const update = await request(server)
      .patch('/categories/some-id')
      .send({ name: 'X' });
    const remove = await request(server).delete('/categories/some-id');

    expect([list.status, create.status, update.status, remove.status]).toEqual([
      401, 401, 401, 401,
    ]);
  });
});
