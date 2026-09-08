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
  CreateTransactionDto as CreateTransactionContract,
  TransactionType,
} from '@repo/shared';

/** No `userId` field: ownership comes from the token, not from the body. */
export class CreateTransactionDto implements CreateTransactionContract {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than zero' })
  // Matches DECIMAL(12,2): without this Postgres raises a numeric overflow and
  // the client sees a 500 instead of a 400.
  @Max(9_999_999_999.99, { message: 'Amount is too large' })
  amount!: number;

  // Validated against the Prisma-generated enum (a runtime object) but typed
  // with the shared union — the backend only ever type-imports @repo/shared.
  @IsEnum(PrismaTransactionType, { message: 'Type must be INCOME or EXPENSE' })
  type!: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string | null;

  @IsDateString({}, { message: 'Date must be an ISO 8601 string' })
  date!: string;

  // A body field that becomes a foreign key, so validating it turns a would-be
  // Prisma FK error into a clean 400. `@Param('id')` stays un-piped, as in
  // CategoriesController.
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId!: string;
}
