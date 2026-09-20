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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import type { TransactionListQueryDto, TransactionType } from '@repo/shared';

/**
 * Query params for `GET /transactions`.
 *
 * The four filters stay strings — they are strings both on the wire and in the
 * query contract, so no `@Type` coercion is needed. `@IsDateString` accepts both
 * `2025-03-01` and a full timestamp; GetTransactionsHandler tells them apart.
 *
 * `page` and `limit` do need coercion: query strings arrive as strings and the
 * global ValidationPipe runs without `enableImplicitConversion` (same reason as
 * TransactionSummaryQueryDto). The field initializers supply the defaults, and
 * both must be declared here or `whitelist: true` would strip them entirely.
 *
 * @throws {BadRequestException} Thrown by the global `ValidationPipe` (not by
 *   this class itself) when a present field fails validation — e.g. `dateFrom`/
 *   `dateTo` is not an ISO date, `type` is not `INCOME`/`EXPENSE`, `categoryId`
 *   is not a UUID, or `page`/`limit` is out of range.
 */
export class GetTransactionsQueryDto implements TransactionListQueryDto {
  @ApiPropertyOptional({
    format: 'date',
    description: 'Inclusive lower bound; date-only or full ISO timestamp',
    example: '2025-03-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be an ISO 8601 date' })
  dateFrom?: string;

  @ApiPropertyOptional({
    format: 'date',
    description:
      'Upper bound; a date-only value (e.g. `2025-03-31`) is read as ' +
      'through the end of that day, a full timestamp is taken as given',
    example: '2025-03-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be an ISO 8601 date' })
  dateTo?: string;

  @ApiPropertyOptional({ enum: ['INCOME', 'EXPENSE'] })
  @IsOptional()
  @IsEnum(PrismaTransactionType, { message: 'type must be INCOME or EXPENSE' })
  type?: TransactionType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId?: string;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: '1-based page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be 1 or greater' })
  page: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Rows per page, capped at 100',
  })
  // Capped so one client cannot ask for the whole table in a single response.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be between 1 and 100' })
  @Max(100, { message: 'limit must be between 1 and 100' })
  limit: number = 10;
}
