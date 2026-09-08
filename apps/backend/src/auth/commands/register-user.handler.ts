import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { AuthResponse } from '@repo/shared';
import { CreateUserCommand, UserReadModel } from '@/users/contracts';
import { RegisterUserCommand } from './register-user.command';
import { TokenService } from '../token.service';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  AuthResponse
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthResponse> {
    // UsersModule owns the uniqueness rule and hashing; a duplicate email comes
    // back as a ConflictException straight through the bus.
    const user = await this.commandBus.execute<
      CreateUserCommand,
      UserReadModel
    >(new CreateUserCommand(command.email, command.name, command.password));

    return this.tokenService.issue(user);
  }
}
