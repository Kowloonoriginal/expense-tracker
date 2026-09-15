import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Safety net for Prisma errors that escape a handler unhandled — not the
 * primary way any single module reports its errors. Two concrete paths that
 * hit it today:
 *
 * - Register does a check-then-act (findByEmail, then create): two concurrent
 *   registrations for the same email can both pass the check and race to
 *   create(), and the loser gets a raw P2002 instead of the 409 the
 *   non-racing path already returns. CreateUserHandler catches this
 *   specifically for a module-accurate message; this filter is the fallback
 *   for every other unique-constraint collision.
 * - Update/remove on categories and transactions check ownership, then act,
 *   in two separate round trips. If the row (or, for a transaction, its
 *   category) is deleted in between, Prisma raises P2025/P2003 instead of
 *   the 404 the handler intended.
 * - Category → Transaction is `onDelete: Restrict` (see schema.prisma):
 *   deleting a category that still has transactions raises P2003 rather than
 *   silently cascading the deletion and destroying financial history.
 *
 * Unmapped Prisma error codes fall through to Nest's default unknown-error
 * handling (logged, 500, no internals in the response body).
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    super.catch(this.toHttpException(exception), host);
  }

  private toHttpException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): unknown {
    switch (exception.code) {
      case 'P2002':
        return new ConflictException('A record with this value already exists');
      case 'P2025':
        return new NotFoundException('Record not found');
      case 'P2003':
        return new ConflictException(
          'Cannot complete this operation because other records depend on this resource',
        );
      default:
        // Not an HttpException, so BaseExceptionFilter routes this through
        // handleUnknownError: logged server-side, a generic 500 in the
        // response — the Prisma internals (column/constraint names) never
        // reach the client.
        return exception;
    }
  }
}
