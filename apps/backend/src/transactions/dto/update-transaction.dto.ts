import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import type {
  TransactionType,
  UpdateTransactionDto as UpdateTransactionContract,
} from '@repo/shared';

/**
 * Every field is optional — a PATCH may carry any subset. `description` is
 * three-way: omitted leaves it alone, `null` clears it, a string replaces it
 * (`@IsOptional()` skips validation for both `undefined` and `null`).
 */
export class UpdateTransactionDto implements UpdateTransactionContract {
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than zero' })
  @Max(9_999_999_999.99, { message: 'Amount is too large' })
  amount?: number;

  @IsOptional()
  @IsEnum(PrismaTransactionType, { message: 'Type must be INCOME or EXPENSE' })
  type?: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'Date must be an ISO 8601 string' })
  date?: string;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId?: string;
}
