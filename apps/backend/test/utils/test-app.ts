import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { PASSWORD_HASHER } from '@/security/password-hasher';
import { FakePasswordHasher } from './fake-hasher';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

/**
 * Boots the real AppModule with the same global pipes as main.ts, so the tests
 * exercise ValidationPipe and every APP_GUARD exactly as production does.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PASSWORD_HASHER)
    .useClass(FakePasswordHasher)
    .compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

/** Unique per call, so throttler buckets never bleed between tests. */
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}@test.local`;
}
