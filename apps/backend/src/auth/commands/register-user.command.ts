export class RegisterUserCommand {
  constructor(
    readonly email: string,
    readonly name: string,
    readonly password: string,
  ) {}

  toJSON() {
    return { email: this.email, name: this.name, password: '[REDACTED]' };
  }
}
