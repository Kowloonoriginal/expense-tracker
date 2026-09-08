import { Module } from '@nestjs/common';
import { LogUserRegisteredHandler } from './handlers/log-user-registered.handler';

@Module({
  providers: [LogUserRegisteredHandler],
})
export class NotificationsModule {}
