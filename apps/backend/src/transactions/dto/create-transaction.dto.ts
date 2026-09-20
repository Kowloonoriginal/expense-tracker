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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import type {
  CreateTransactionDto as CreateTransactionContract,
  TransactionType,
} from '@repo/shared';

/**
 * Request body for `POST /transactions`.
 *
 * No `userId` field: ownership comes from the token, not from the body.
 *
 * @throws {BadRequestException} Thrown by the global `ValidationPipe` (not by
 *   this class itself) when any decorated field fails validation — e.g.
 *   `amount` is non-positive, has more than 2 decimal places, or exceeds the
 *   `DECIMAL(12,2)` column; `type` is not `INCOME`/`EXPENSE`; `date` is not an
 *   ISO 8601 string; or `categoryId` is not a UUID.
 */
export class CreateTransactionDto implements CreateTransactionContract {
  @ApiProperty({
    example: 42.5,
    description: 'Positive amount, at most 2 decimal places',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than zero' })
  // Matches DECIMAL(12,2): without this Postgres raises a numeric overflow and
  // the client sees a 500 instead of a 400.
  @Max(9_999_999_999.99, { message: 'Amount is too large' })
  amount!: number;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  // Validated against the Prisma-generated enum (a runtime object) but typed
  // with the shared union — the backend only ever type-imports @repo/shared.
  @IsEnum(PrismaTransactionType, { message: 'Type must be INCOME or EXPENSE' })
  type!: TransactionType;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 255,
    example: 'Coffee with a client',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string | null;

  @ApiProperty({ format: 'date-time', example: '2025-03-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'Date must be an ISO 8601 string' })
  date!: string;

  @ApiProperty({ format: 'uuid' })
  // A body field that becomes a foreign key, so validating it turns a would-be
  // Prisma FK error into a clean 400. `@Param('id')` stays un-piped, as in
  // CategoriesController.
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId!: string;
}
