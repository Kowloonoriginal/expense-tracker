import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

const TEST_DB_NAME = 'expense_tracker_test';

/**
 * Creates the test database if it is missing and brings it up to the latest
 * migration. Runs once per jest invocation, before any suite.
 */
export default async function globalSetup() {
  config({
    path: resolve(__dirname, '.env.test'),
    override: true,
    quiet: true,
  });

  const testUrl = process.env.DATABASE_URL;

  if (!testUrl || !testUrl.includes(TEST_DB_NAME)) {
    throw new Error(
      `Refusing to run e2e tests: DATABASE_URL must point at ${TEST_DB_NAME}`,
    );
  }

  const adminUrl = testUrl.replace(`/${TEST_DB_NAME}`, '/postgres');
  const admin = new PrismaClient({ datasourceUrl: adminUrl });

  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB_NAME}"`);
  } catch {
    // Already exists — that is the normal case on every run but the first.
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'ignore',
  });
}
