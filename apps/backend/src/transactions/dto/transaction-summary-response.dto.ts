import { ApiProperty } from '@nestjs/swagger';
import type { TransactionSummary } from '@repo/shared';
import { CategorySummaryResponseDto } from './category-summary-response.dto';

/**
 * Swagger-only response shape for `GET /transactions/summary`. See
 * `TransactionResponseDto` for why this exists instead of decorating
 * `TransactionSummaryReadModel` itself.
 */
export class TransactionSummaryResponseDto implements TransactionSummary {
  @ApiProperty({ example: 3, minimum: 1, maximum: 12 })
  month!: number;

  @ApiProperty({ example: 2025 })
  year!: number;

  @ApiProperty({ example: 4200.5 })
  income!: number;

  @ApiProperty({ example: 1875.2 })
  expense!: number;

  @ApiProperty({ example: 2325.3, description: 'income - expense' })
  balance!: number;

  @ApiProperty({ type: [CategorySummaryResponseDto] })
  byCategory!: CategorySummaryResponseDto[];
}
