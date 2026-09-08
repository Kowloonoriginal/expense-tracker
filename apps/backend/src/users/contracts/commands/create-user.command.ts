/**
 * Carries the plaintext password: UsersModule owns both hashing and
 * verification, so the raw value has to cross the bus once.
 *
 * `toJSON` keeps it out of anything that serialises commands — CQRS logging
 * interceptors dump the whole object by default.
 */
export class CreateUserCommand {
  constructor(
    readonly email: string,
    readonly name: string,
    readonly password: string,
  ) {}

  toJSON() {
    return { email: this.email, name: this.name, password: '[REDACTED]' };
  }
}
