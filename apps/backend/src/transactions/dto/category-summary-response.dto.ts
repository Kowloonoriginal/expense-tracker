import { ApiProperty } from '@nestjs/swagger';
import type { CategorySummary, TransactionType } from '@repo/shared';

/**
 * Swagger-only shape of one row in `TransactionSummaryResponseDto.byCategory`.
 * See `TransactionResponseDto` for why this exists instead of decorating
 * `CategorySummaryReadModel` itself.
 */
export class CategorySummaryResponseDto implements CategorySummary {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 'Groceries' })
  name!: string;

  @ApiProperty({ example: '#22C55E' })
  color!: string;

  @ApiProperty({ example: 'shopping-cart' })
  icon!: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  type!: TransactionType;

  @ApiProperty({
    example: 123.45,
    description: 'Summed amount for this category and type',
  })
  total!: number;
}
