import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserHandler } from './handlers/create-user.handler';
import { GetUserByIdHandler } from './handlers/get-user-by-id.handler';
import { VerifyPasswordHandler } from './handlers/verify-password.handler';

const handlers = [CreateUserHandler, GetUserByIdHandler, VerifyPasswordHandler];

/**
 * Exports nothing: other modules reach this one through the buses, using the
 * classes in ./contracts.
 */
@Module({
  providers: [UsersRepository, ...handlers],
})
export class UsersModule {}
