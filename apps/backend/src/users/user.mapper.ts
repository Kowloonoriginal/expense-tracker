import { User } from '@prisma/client';
import { UserReadModel } from './contracts';

/** Strips the password hash before a user ever leaves the module. */
export function toUserReadModel(user: User): UserReadModel {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    currency: user.currency,
    // ISO string, matching what JSON.stringify produced anyway — see the note on
    // the shared interfaces.
    createdAt: user.createdAt.toISOString(),
  };
}
