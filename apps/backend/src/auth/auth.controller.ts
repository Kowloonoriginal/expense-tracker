import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse } from '@repo/shared';
import { UserReadModel } from '@/users/contracts';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterUserCommand } from './commands/register-user.command';
import { LoginUserCommand } from './commands/login-user.command';
import { loginTracker } from './throttling/login-tracker';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.commandBus.execute(
      new RegisterUserCommand(dto.email, dto.name, dto.password),
    );
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5, getTracker: loginTracker } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.commandBus.execute(
      new LoginUserCommand(dto.email, dto.password),
    );
  }

  /** Protected by the global JwtAuthGuard — used by the frontend to restore a session. */
  @Get('me')
  me(@CurrentUser() user: UserReadModel): UserReadModel {
    return user;
  }
}
