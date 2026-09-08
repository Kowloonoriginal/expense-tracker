/**
 * The public surface of UsersModule. Other modules import from here and nothing
 * else — the repository and the handlers are internal.
 */
export * from './commands/create-user.command';
export * from './queries/get-user-by-id.query';
export * from './queries/verify-password.query';
export * from './events/user-registered.event';
export * from './models/user.read-model';
