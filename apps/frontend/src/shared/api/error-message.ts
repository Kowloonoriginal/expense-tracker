import { ApiError } from './client';

/**
 * Generic fallback copy for anything that is not an ApiError. Auth flows layer
 * their own status-specific messages on top — see entities/session/auth-error.
 */
export function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;

  return 'Щось пішло не так. Спробуйте ще раз.';
}
