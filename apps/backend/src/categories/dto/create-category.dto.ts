import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { CreateCategoryDto as CreateCategoryContract } from '@repo/shared';

/** No `userId` field: ownership comes from the token, not from the body. */
export class CreateCategoryDto implements CreateCategoryContract {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(40, { message: 'Name must not exceed 40 characters' })
  name!: string;

  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Color must be a hex value such as #A3B1FF',
  })
  color!: string;

  @IsString()
  @MinLength(1, { message: 'Icon is required' })
  @MaxLength(40, { message: 'Icon must not exceed 40 characters' })
  icon!: string;
}
