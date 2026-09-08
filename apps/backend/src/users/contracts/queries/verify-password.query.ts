/**
 * Returns the user id on success and null on failure — the stored hash never
 * crosses the module boundary, so callers cannot learn the algorithm or the
 * digest even by accident.
 */
export class VerifyPasswordQuery {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {}

  toJSON() {
    return { email: this.email, password: '[REDACTED]' };
  }
}
