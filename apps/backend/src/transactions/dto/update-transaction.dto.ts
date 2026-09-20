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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import type {
  TransactionType,
  UpdateTransactionDto as UpdateTransactionContract,
} from '@repo/shared';

/**
 * Request body for `PATCH /transactions/:id`.
 *
 * Every field is optional — a PATCH may carry any subset. `description` is
 * three-way: omitted leaves it alone, `null` clears it, a string replaces it
 * (`@IsOptional()` skips validation for both `undefined` and `null`).
 *
 * @throws {BadRequestException} Thrown by the global `ValidationPipe` (not by
 *   this class itself) when a present field fails validation — same rules as
 *   {@link CreateTransactionDto}.
 */
export class UpdateTransactionDto implements UpdateTransactionContract {
  @ApiPropertyOptional({
    example: 42.5,
    description: 'Positive amount, at most 2 decimal places',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than zero' })
  @Max(9_999_999_999.99, { message: 'Amount is too large' })
  amount?: number;

  @ApiPropertyOptional({ enum: ['INCOME', 'EXPENSE'] })
  @IsOptional()
  @IsEnum(PrismaTransactionType, { message: 'Type must be INCOME or EXPENSE' })
  type?: TransactionType;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 255,
    description: 'Omit to leave unchanged; `null` clears it.',
    example: 'Coffee with a client',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string | null;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2025-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date must be an ISO 8601 string' })
  date?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId?: string;
}
