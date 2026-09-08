import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import type { AuthResponse } from '@repo/shared';
import {
  GetUserByIdQuery,
  UserReadModel,
  VerifyPasswordQuery,
} from '@/users/contracts';
import { LoginUserCommand } from './login-user.command';
import { TokenService } from '../token.service';
import { jitter } from '../utils/jitter';

/**
 * A command rather than a query: it issues a token today, and lastLoginAt, a
 * failed-attempt counter and an audit trail all belong here tomorrow.
 */
@CommandHandler(LoginUserCommand)
export class LoginUserHandler implements ICommandHandler<
  LoginUserCommand,
  AuthResponse
> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthResponse> {
    const userId = await this.queryBus.execute<
      VerifyPasswordQuery,
      string | null
    >(new VerifyPasswordQuery(command.email, command.password));

    if (!userId) {
      await jitter();
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.queryBus.execute<
      GetUserByIdQuery,
      UserReadModel | null
    >(new GetUserByIdQuery(userId));

    if (!user) {
      await jitter();
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.tokenService.issue(user);
  }
}
