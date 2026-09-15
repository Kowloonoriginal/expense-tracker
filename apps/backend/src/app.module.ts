import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { validateEnv } from './config/validate-env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Baseline limit for every route; auth routes tighten it with @Throttle().
    //
    // A route's @Throttle() REPLACES the named throttler it targets — it does
    // not add a second bucket on top. So a route decorated with only
    // `{ default: {...} }` loses the global per-IP ceiling entirely and keeps
    // only whatever the decorator specifies. `/auth/login`'s per-(ip,email)
    // bucket (see login-tracker.ts) is exactly this: without a second named
    // throttler it is the *only* limit on that route, so one IP spraying one
    // password across many emails hits zero aggregate limit — every attempt
    // lands in its own fresh (ip, email) bucket. `auth-ip` restores a per-IP
    // ceiling that a route-level @Throttle cannot silently discard, since a
    // decorator only overrides the throttlers it names.
    //
    // `auth-ip` applies to every route by default (it's registered here, not
    // per-controller), so AppController, CategoriesController and
    // TransactionsController each carry `@SkipThrottle({ 'auth-ip': true })` —
    // otherwise ordinary authenticated usage (paging, filtering, the
    // per-navigation /auth/me refresh) would share the same 20/min budget
    // meant for password spraying and trip it during normal use.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
      { name: 'auth-ip', ttl: 60_000, limit: 20, blockDuration: 300_000 },
    ]),
    // Global: CommandBus/QueryBus/EventBus are injectable everywhere.
    CqrsModule.forRoot(),
    PrismaModule,
    SecurityModule,
    UsersModule,
    AuthModule,
    NotificationsModule,
    CategoriesModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
