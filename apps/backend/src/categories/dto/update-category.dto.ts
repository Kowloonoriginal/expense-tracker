import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UpdateCategoryDto as UpdateCategoryContract } from '@repo/shared';

/**
 * Every field is optional — a PATCH may carry any subset. `@IsOptional()`
 * short-circuits the other validators when the field is absent, and the global
 * `ValidationPipe({ whitelist: true })` drops anything not listed here.
 */
export class UpdateCategoryDto implements UpdateCategoryContract {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(40, { message: 'Name must not exceed 40 characters' })
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Color must be a hex value such as #A3B1FF',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Icon must not be empty' })
  @MaxLength(40, { message: 'Icon must not exceed 40 characters' })
  icon?: string;
}
