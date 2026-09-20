import { ApiProperty } from '@nestjs/swagger';
import type { Transaction, TransactionType } from '@repo/shared';

/**
 * Swagger-only response shape for a single transaction. `TransactionReadModel`
 * (from `../contracts`) is a plain interface and carries no reflectable
 * metadata, so this class exists purely for `@ApiResponse({ type: ... })` — it
 * is never constructed; handlers keep returning `TransactionReadModel`.
 */
export class TransactionResponseDto implements Transaction {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 42.5,
    description: 'Amount, at most 2 decimal places',
  })
  amount!: number;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  type!: TransactionType;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Coffee with a client',
  })
  description!: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'ISO 8601. A date-only input is stored as midnight UTC.',
  })
  date!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
