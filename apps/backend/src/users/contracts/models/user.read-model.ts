import type { User } from '@repo/shared';

/**
 * The only shape of a user that leaves UsersModule. It is the shared `User`
 * interface, which by construction has no password hash.
 */
export type UserReadModel = User;
