const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as NestErrorBody;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

type TokenProvider = () => string | null;

let tokenProvider: TokenProvider = () => null;
let onUnauthorized: (() => void) | null = null;

/**
 * Dependency inversion for auth: `shared` may not import `entities`, so it
 * declares the port here and `entities/session` injects the adapter. Moving the
 * token out of localStorage later changes the adapter and nothing else.
 */
export function setAuthTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/** Fired once, centrally, when the server rejects a token we actually sent. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/** Generic fetch wrapper for the Nest backend — not auth-specific, reused by every entity's api/. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, 'NEXT_PUBLIC_API_URL не налаштовано');
  }

  const token = tokenProvider();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Only when there is one: an anonymous /auth/login must not send
        // `Authorization: Bearer null`.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Не вдалося з'єднатися з сервером. Спробуйте ще раз.",
    );
  }

  if (!response.ok) {
    // A 401 *with* a token means the token is stale — sign out. A 401 *without*
    // one is a failed sign-in, and must clear nothing and redirect nowhere, or a
    // mistyped password would bounce the login page off itself. The presence of
    // the token is the whole discriminator; no per-path allowlist is needed.
    if (response.status === 401 && token) onUnauthorized?.();

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // non-JSON error body — fall through to the fallback message
    }
    throw new ApiError(
      response.status,
      extractMessage(body, `Помилка запиту (${response.status})`),
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
