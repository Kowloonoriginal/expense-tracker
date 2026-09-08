import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PASSWORD_HASHER, PasswordHasher } from '@/security/password-hasher';
import { UsersRepository } from '../users.repository';
import { VerifyPasswordQuery } from '../contracts';

@QueryHandler(VerifyPasswordQuery)
export class VerifyPasswordHandler implements IQueryHandler<
  VerifyPasswordQuery,
  string | null
> {
  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(query: VerifyPasswordQuery): Promise<string | null> {
    const user = await this.usersRepository.findByEmail(
      query.email.toLowerCase().trim(),
    );

    if (!user) {
      return null;
    }

    const matches = await this.passwordHasher.verify(
      query.password,
      user.passwordHash,
    );

    return matches ? user.id : null;
  }
}
