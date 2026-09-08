import type { AuthResponse, LoginDto, RegisterDto, User } from '@repo/shared';
import { apiFetch } from '@/shared/api/client';

/** Re-reads the account behind the current token — also a token-validity probe. */
export function me(): Promise<User> {
  return apiFetch<User>('/auth/me');
}

export function login(dto: LoginDto): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function register(dto: RegisterDto): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}
