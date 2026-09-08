import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import type { TransactionListQueryDto, TransactionType } from '@repo/shared';

/**
 * The four filters stay strings — they are strings both on the wire and in the
 * query contract, so no `@Type` coercion is needed. `@IsDateString` accepts both
 * `2025-03-01` and a full timestamp; GetTransactionsHandler tells them apart.
 *
 * `page` and `limit` do need coercion: query strings arrive as strings and the
 * global ValidationPipe runs without `enableImplicitConversion` (same reason as
 * TransactionSummaryQueryDto). The field initializers supply the defaults, and
 * both must be declared here or `whitelist: true` would strip them entirely.
 */
export class GetTransactionsQueryDto implements TransactionListQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be an ISO 8601 date' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be an ISO 8601 date' })
  dateTo?: string;

  @IsOptional()
  @IsEnum(PrismaTransactionType, { message: 'type must be INCOME or EXPENSE' })
  type?: TransactionType;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be 1 or greater' })
  page: number = 1;

  // Capped so one client cannot ask for the whole table in a single response.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be between 1 and 100' })
  @Max(100, { message: 'limit must be between 1 and 100' })
  limit: number = 10;
}
