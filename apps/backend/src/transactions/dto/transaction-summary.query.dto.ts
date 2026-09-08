import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import type { TransactionSummaryQueryDto as SummaryQueryContract } from '@repo/shared';

/**
 * Both params are REQUIRED — note the absence of `@IsOptional()`.
 *
 * Query strings arrive as strings and the global ValidationPipe runs without
 * `enableImplicitConversion`, so `@Type(() => Number)` does the coercion before
 * `@IsInt` runs. A missing param stays `undefined` (`@Type` fabricates nothing),
 * so `@IsInt` rejects it and the client gets a 400 rather than a window built
 * from NaN.
 */
export class TransactionSummaryQueryDto implements SummaryQueryContract {
  @Type(() => Number)
  @IsInt({ message: 'month must be an integer between 1 and 12' })
  @Min(1, { message: 'month must be between 1 and 12' })
  @Max(12, { message: 'month must be between 1 and 12' })
  month!: number;

  @Type(() => Number)
  @IsInt({ message: 'year must be an integer' })
  @Min(1970, { message: 'year must be between 1970 and 9999' })
  @Max(9999, { message: 'year must be between 1970 and 9999' })
  year!: number;
}
