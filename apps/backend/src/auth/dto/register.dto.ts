import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { RegisterDto as RegisterContract } from '@repo/shared';

export class RegisterDto implements RegisterContract {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(60)
  name!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  password!: string;
}
