/**
 * Injection token for the password hashing strategy.
 *
 * Modules depend on this token rather than on bcrypt directly, so the algorithm
 * can be swapped (argon2, scrypt) and replaced with a fast fake in tests.
 */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
