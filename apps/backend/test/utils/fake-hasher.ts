import { PasswordHasher } from '@/security/password-hasher';

/**
 * Test double for the bcrypt hasher. bcrypt costs ~80ms per call by design, so
 * a suite that registers a dozen users would spend seconds on pure crypto.
 */
export class FakePasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`fake:${plain}`);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `fake:${plain}`);
  }
}
