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

/** Generic fetch wrapper for the Nest backend — not auth-specific, reused by every entity's api/. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, 'NEXT_PUBLIC_API_URL не налаштовано');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
