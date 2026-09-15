import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
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

    let user;

    try {
      user = await this.usersRepository.create({
        email,
        name: command.name.trim(),
        passwordHash: await this.passwordHasher.hash(command.password),
      });
    } catch (error) {
      // findByEmail-then-create above is check-then-act, not atomic: two
      // concurrent registrations for the same email can both pass the check
      // and race to create(). Whichever loses hits the database's unique
      // constraint — caught here so it gets the same message as the
      // non-racing path, rather than PrismaClientExceptionFilter's generic
      // fallback for every other unique-constraint collision in the app.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }

    this.eventBus.publish(
      new UserRegisteredEvent(user.id, user.email, user.name),
    );

    return toUserReadModel(user);
  }
}
