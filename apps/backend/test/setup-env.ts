import { config } from 'dotenv';
import { resolve } from 'node:path';

// Runs before the Nest app is built, so PrismaClient and ConfigService both
// pick up the test database instead of the dev one.
config({ path: resolve(__dirname, '.env.test'), override: true, quiet: true });
