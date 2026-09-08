import { ApiError } from '@/shared/api/client';

const MESSAGE_BY_STATUS: Record<number, string> = {
  401: 'Невірний email або пароль',
  409: 'Користувач з таким email вже існує',
  429: 'Забагато спроб. Спробуйте за хвилину.',
};

/**
 * Backend messages are hardcoded English while the UI is Ukrainian, so the auth
 * statuses the forms actually surface get their own copy here. Anything else
 * keeps the server's own text — a 400 carries the per-field validation details.
 */
export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Щось пішло не так. Спробуйте ще раз.';
  }

  return MESSAGE_BY_STATUS[error.status] ?? error.message;
}
