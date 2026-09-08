import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import type { TransactionFiltersDto, TransactionType } from '@repo/shared';

/**
 * All four filters stay strings — they are strings both on the wire and in the
 * query contract, so no `@Type` coercion is needed. `@IsDateString` accepts both
 * `2025-03-01` and a full timestamp; GetTransactionsHandler tells them apart.
 */
export class GetTransactionsQueryDto implements TransactionFiltersDto {
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
}
