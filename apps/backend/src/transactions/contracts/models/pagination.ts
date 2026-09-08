import type { PaginationQueryDto } from '@repo/shared';

/**
 * Resolved pagination: the DTO has already applied its defaults, so nothing here
 * is optional and no handler has to invent a page size.
 */
export type Pagination = Required<PaginationQueryDto>;
