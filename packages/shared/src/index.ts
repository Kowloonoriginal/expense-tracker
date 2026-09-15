/**
 * These interfaces describe the HTTP contract, and JSON has no `Date` type —
 * every timestamp below is an ISO 8601 string exactly as the backend serialises
 * it. Typing them as `Date` would type-check and then throw the first time
 * anyone called a Date method on the parsed response.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  currency: string;
  /** ISO 8601, e.g. `2025-03-01T00:00:00.000Z`. */
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
}

/** Superseded by `Transaction`; kept for compatibility, nothing constructs one. */
export interface Expense {
  id: string;
  amount: number;
  description: string;
  /** ISO 8601 — see the file header note on why these aren't `Date`. */
  date: string;
  categoryId: string;
  userId: string;
  /** ISO 8601. */
  createdAt: string;
}

/**
 * Mirrors the Prisma enum of the same name. Declared as a union rather than a
 * TS enum on purpose: the backend imports from `@repo/shared` with `import type`
 * only, so nothing here may exist at runtime.
 */
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  /** ISO 8601. A date-only input is stored as midnight UTC. */
  date: string;
  categoryId: string;
  userId: string;
  /** ISO 8601. */
  createdAt: string;
}

export interface CreateExpenseDto {
  amount: number;
  description: string;
  date: string;
  categoryId: string;
}

export interface CreateTransactionDto {
  amount: number;
  type: TransactionType;
  /** Omit to leave empty; an explicit `null` clears it on update. */
  description?: string | null;
  date: string;
  categoryId: string;
}

export interface UpdateTransactionDto {
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  date?: string;
  categoryId?: string;
}

/**
 * Envelope every paginated list endpoint returns. `page` and `limit` echo what
 * the server actually applied, so the client never has to guess its defaults.
 *
 * `totalPages` is deliberately absent: it is `Math.ceil(total / limit)`, and a
 * second source of truth for one number eventually disagrees with the first.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  /** 1-based, echoed even when it points past the last page. */
  page: number;
  limit: number;
}

/** Pagination half of a list query. Server defaults: page 1, limit 10 (max 100). */
export interface PaginationQueryDto {
  page?: number;
  limit?: number;
}

/** Which rows to select. Kept separate from pagination, which slices the result. */
export interface TransactionFiltersDto {
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType;
  categoryId?: string;
}

/** Full query string of `GET /transactions`: filters plus pagination. */
export interface TransactionListQueryDto
  extends TransactionFiltersDto, PaginationQueryDto {}

/** Query string of `GET /transactions/summary`. Both fields are required. */
export interface TransactionSummaryQueryDto {
  month: number;
  year: number;
}

/** One row of the summary breakdown: a category, for one transaction type. */
export interface CategorySummary {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  type: TransactionType;
  total: number;
}

export interface TransactionSummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
  byCategory: CategorySummary[];
}

export interface CreateCategoryDto {
  name: string;
  color: string;
  icon: string;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  icon?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** Payload we sign into the JWT. `sub` is the user id (RFC 7519 convention). */
export interface JwtPayload {
  sub: string;
  email: string;
}
