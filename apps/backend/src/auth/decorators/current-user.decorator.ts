import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { UserReadModel } from '@/users/contracts';

/**
 * Injects the user that JwtStrategy.validate() attached to the request.
 * Usage: `@CurrentUser() user: UserReadModel` or `@CurrentUser('id') id: string`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserReadModel | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: UserReadModel }>();

    return data ? request.user?.[data] : request.user;
  },
);
