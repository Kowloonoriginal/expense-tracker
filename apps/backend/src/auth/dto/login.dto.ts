import { IsEmail, IsString, MinLength } from 'class-validator';
import type { LoginDto as LoginContract } from '@repo/shared';

export class LoginDto implements LoginContract {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;
}
