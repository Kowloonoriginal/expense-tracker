import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../users.repository';
import { toUserReadModel } from '../user.mapper';
import { GetUserByIdQuery, UserReadModel } from '../contracts';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<
  GetUserByIdQuery,
  UserReadModel | null
> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: GetUserByIdQuery): Promise<UserReadModel | null> {
    const user = await this.usersRepository.findById(query.userId);

    return user ? toUserReadModel(user) : null;
  }
}
