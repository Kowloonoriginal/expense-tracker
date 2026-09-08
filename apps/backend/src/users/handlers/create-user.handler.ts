import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { PASSWORD_HASHER, PasswordHasher } from '@/security/password-hasher';
import { UsersRepository } from '../users.repository';
import { toUserReadModel } from '../user.mapper';
import {
  CreateUserCommand,
  UserReadModel,
  UserRegisteredEvent,
} from '../contracts';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<
  CreateUserCommand,
  UserReadModel
> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventBus: EventBus,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserReadModel> {
    const email = command.email.toLowerCase().trim();
    const existing = await this.usersRepository.findByEmail(email);

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersRepository.create({
      email,
      name: command.name.trim(),
      passwordHash: await this.passwordHasher.hash(command.password),
    });

    this.eventBus.publish(
      new UserRegisteredEvent(user.id, user.email, user.name),
    );

    return toUserReadModel(user);
  }
}
