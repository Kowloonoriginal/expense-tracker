import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // Typed as the Express variant solely for `.set('trust proxy', ...)` below,
  // which INestApplication doesn't expose — Nest still defaults to the
  // Express adapter, so this is a type-level change only.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Off by default: every IP-keyed rate limit (the global 100/min and
  // auth-ip's 20/min, app.module.ts) reads req.ip, which without a trusted
  // proxy in front is the real client address and cannot be spoofed. Behind a
  // reverse proxy (Nginx, a cloud load balancer, ...) req.ip becomes the
  // proxy's own address for every request instead, collapsing every client
  // into one shared bucket — that is what TRUST_PROXY=1 fixes. Turning it on
  // without an actual proxy that strips client-supplied X-Forwarded-For
  // would let any caller set their own IP per request and bypass every
  // limit, so this must only be set once that proxy exists and is confirmed
  // to strip the header.
  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // JwtAuthGuard is global (APP_GUARD), so every route needs a bearer token
  // unless it is @Public() — `addBearerAuth()` is what puts the "Authorize"
  // button in the UI and lets `@ApiBearerAuth()` reference the scheme by name.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Expense Tracker API')
    .setDescription('REST API for the Expense Tracker backend')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT || 3001;
  await app.listen(port);
}

bootstrap();
