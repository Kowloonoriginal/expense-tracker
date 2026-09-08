export class LoginUserCommand {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {}

  toJSON() {
    return { email: this.email, password: '[REDACTED]' };
  }
}
