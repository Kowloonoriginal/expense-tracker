import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail } from './utils/test-app';

/**
 * A fresh app instance for this file, so the in-memory throttler storage
 * starts empty and is not shared with auth.e2e-spec.ts's same-email throttle
 * test — the two must not interfere with each other's counts.
 */
describe('Auth rate limiting across distinct emails (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('caps total login attempts from one IP even when every attempt uses a different email', async () => {
    // The per-(ip,email) bucket (5/min, see login-tracker.ts) never trips
    // here — every request is a fresh, never-seen email, so each gets its own
    // bucket with 5 attempts to spare. It is the per-IP `auth-ip` bucket
    // (20/min, app.module.ts) that must catch this: one attacker cycling
    // through candidate emails from a single address is exactly what it
    // exists to stop.
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 21; attempt += 1) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail(`spray-${attempt}`),
          password: 'wrong-password',
        });
      statuses.push(res.status);
    }

    // The first 20 requests each hit a brand-new (ip,email) bucket, so none
    // trips the per-email limit — they get the ordinary "unknown email" 401.
    // The 21st is where the aggregate per-IP ceiling bites.
    expect(statuses.slice(0, 20).every((status) => status === 401)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it('does not throttle authenticated routes against the same budget', async () => {
    // GET /categories opts out via @SkipThrottle({ 'auth-ip': true }) — an
    // authenticated user paging through their own data must not share the
    // budget meant for password spraying.
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('unthrottled'),
        name: 'Test User',
        password: 'password123',
      });

    const token = registered.body.accessToken as string;
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${token}`);
      statuses.push(res.status);
    }

    expect(statuses.every((status) => status === 200)).toBe(true);
  });
});
