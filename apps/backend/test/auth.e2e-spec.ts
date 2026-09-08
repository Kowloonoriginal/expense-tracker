import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp, uniqueEmail } from './utils/test-app';

const PASSWORD = 'password123';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const register = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/register').send(body);

  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user and returns a token', async () => {
    const email = uniqueEmail();

    const res = await register({
      email,
      name: 'Test User',
      password: PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user).toMatchObject({ email, name: 'Test User' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail();

    await register({ email, name: 'First', password: PASSWORD });
    const res = await register({ email, name: 'Second', password: PASSWORD });

    expect(res.status).toBe(409);
  });

  it('rejects a short password with 400', async () => {
    const res = await register({
      email: uniqueEmail(),
      name: 'Test User',
      password: 'short',
    });

    expect(res.status).toBe(400);
  });

  it('strips unknown fields from the request body', async () => {
    const email = uniqueEmail();

    const res = await register({
      email,
      name: 'Test User',
      password: PASSWORD,
      isAdmin: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.user).not.toHaveProperty('isAdmin');
  });

  it('logs in with correct credentials', async () => {
    const email = uniqueEmail();
    await register({ email, name: 'Test User', password: PASSWORD });

    const res = await login({ email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('returns an identical 401 for a wrong password and an unknown email', async () => {
    const email = uniqueEmail();
    await register({ email, name: 'Test User', password: PASSWORD });

    const wrongPassword = await login({ email, password: 'wrong-password' });
    const unknownEmail = await login({
      email: uniqueEmail('ghost'),
      password: PASSWORD,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Identical bodies: the response must not reveal which emails are registered.
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('returns the current user for a valid token', async () => {
    const email = uniqueEmail();
    const registered = await register({
      email,
      name: 'Test User',
      password: PASSWORD,
    });

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email,
      name: 'Test User',
      currency: 'UAH',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('rejects /auth/me without a token and with a malformed one', async () => {
    const missing = await request(app.getHttpServer()).get('/auth/me');
    const malformed = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(missing.status).toBe(401);
    expect(malformed.status).toBe(401);
  });

  it('rejects a token whose user no longer exists', async () => {
    const email = uniqueEmail();
    const registered = await register({
      email,
      name: 'Test User',
      password: PASSWORD,
    });

    await prisma.user.delete({ where: { id: registered.body.user.id } });

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`);

    expect(res.status).toBe(401);
  });

  it('throttles the 6th failed login for the same email', async () => {
    const email = uniqueEmail('throttled');
    await register({ email, name: 'Test User', password: PASSWORD });

    const statuses: number[] = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await login({ email, password: 'wrong-password' });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });
});
