import { User } from '@prisma/client';
import { UsersRepository } from '../users.repository';
import { GetUserByIdQuery } from '../contracts';
import { GetUserByIdHandler } from './get-user-by-id.handler';

describe('GetUserByIdHandler', () => {
  let usersRepository: jest.Mocked<UsersRepository>;
  let handler: GetUserByIdHandler;

  beforeEach(() => {
    usersRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    handler = new GetUserByIdHandler(usersRepository);
  });

  it('returns the mapped read model when the user exists', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const user: User = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed',
      avatarUrl: null,
      currency: 'UAH',
      createdAt,
      updatedAt: createdAt,
    };
    usersRepository.findById.mockResolvedValue(user);

    const result = await handler.execute(new GetUserByIdQuery('user-1'));

    expect(usersRepository.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      currency: 'UAH',
      createdAt: createdAt.toISOString(),
    });
    // The password hash must never leave the module via the read model.
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns null when the user does not exist', async () => {
    usersRepository.findById.mockResolvedValue(null);

    const result = await handler.execute(new GetUserByIdQuery('missing'));

    expect(usersRepository.findById).toHaveBeenCalledWith('missing');
    expect(result).toBeNull();
  });
});
