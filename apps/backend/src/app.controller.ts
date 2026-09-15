import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

// The `auth-ip` throttler (app.module.ts) is scoped to /auth/register and
// /auth/login only — everywhere else, including this health check, opts out
// so monitoring polls and ordinary app usage never trip it.
@SkipThrottle({ 'auth-ip': true })
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }
}
