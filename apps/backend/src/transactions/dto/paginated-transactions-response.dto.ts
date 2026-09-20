import { ApiProperty } from '@nestjs/swagger';
import type { Paginated, Transaction } from '@repo/shared';
import { TransactionResponseDto } from './transaction-response.dto';

/**
 * Swagger-only response shape for `GET /transactions`. See
 * `TransactionResponseDto` for why this exists instead of decorating
 * `PaginatedTransactionsReadModel` itself.
 */
export class PaginatedTransactionsResponseDto implements Paginated<Transaction> {
  @ApiProperty({ type: [TransactionResponseDto] })
  items!: TransactionResponseDto[];

  @ApiProperty({
    example: 37,
    description: 'Row count across all pages under the same filters',
  })
  total!: number;

  @ApiProperty({
    example: 1,
    description: '1-based, echoed even past the last page',
  })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;
}
