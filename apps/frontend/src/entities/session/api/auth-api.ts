import type { AuthResponse, LoginDto, RegisterDto } from '@repo/shared';
import { apiFetch } from '@/shared/api/client';

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
