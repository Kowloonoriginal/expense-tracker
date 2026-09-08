import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegisteredEvent } from '@/users/contracts';

/**
 * First consumer of UserRegisteredEvent, and proof that the event has a
 * subscriber outside UsersModule. CreateDefaultCategoriesHandler and the
 * welcome email will sit next to it without UsersModule changing at all.
 */
@EventsHandler(UserRegisteredEvent)
export class LogUserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  private readonly logger = new Logger(LogUserRegisteredHandler.name);

  handle(event: UserRegisteredEvent) {
    this.logger.log(`User registered: ${event.email} (${event.userId})`);
  }
}
