import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetTransactionsQueryDto } from './dto/get-transactions.query.dto';
import { TransactionSummaryQueryDto } from './dto/transaction-summary.query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { PaginatedTransactionsResponseDto } from './dto/paginated-transactions-response.dto';
import { TransactionSummaryResponseDto } from './dto/transaction-summary-response.dto';
import {
  CreateTransactionCommand,
  GetTransactionByIdQuery,
  GetTransactionSummaryQuery,
  GetTransactionsQuery,
  PaginatedTransactionsReadModel,
  RemoveTransactionCommand,
  TransactionReadModel,
  TransactionSummaryReadModel,
  UpdateTransactionCommand,
} from './contracts';

/**
 * Every route here is protected by the global JwtAuthGuard — none is `@Public()`
 * — and every one is scoped to `@CurrentUser('id')`, so a user can only ever
 * read or write their own transactions.
 *
 * The `auth-ip` throttler (app.module.ts) is scoped to /auth/register and
 * /auth/login only — an authenticated user paging through their own data is
 * not the password-spraying scenario it exists for, so this controller opts
 * out rather than sharing that budget.
 */
@ApiTags('transactions')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Missing or invalid bearer token',
  type: ErrorResponseDto,
})
@SkipThrottle({ 'auth-ip': true })
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Creates a transaction owned by the caller.
   *
   * @param userId - Id of the authenticated user, taken from the JWT, never
   *   from the request body.
   * @param dto - Validated request body (`CreateTransactionDto`).
   * @returns The created transaction, mapped to `TransactionReadModel`.
   * @throws {NotFoundException} `dto.categoryId` does not exist or belongs to
   *   another user (raised by `CreateTransactionHandler`, propagated through
   *   the command bus).
   */
  @ApiOperation({ summary: 'Create a transaction owned by the caller' })
  @ApiCreatedResponse({
    description: 'Transaction created',
    type: TransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed on the request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '`categoryId` does not exist or belongs to another user',
    type: ErrorResponseDto,
  })
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionReadModel> {
    return this.commandBus.execute(
      new CreateTransactionCommand(
        userId,
        dto.amount,
        dto.type,
        dto.date,
        dto.categoryId,
        dto.description,
      ),
    );
  }

  /**
   * Lists the caller's transactions, filtered and paginated.
   *
   * @param userId - Id of the authenticated user; every result is scoped to it.
   * @param query - Validated query params (`GetTransactionsQueryDto`): date
   *   range, type, category and page/limit.
   * @returns One page of transactions plus the total row count.
   */
  @ApiOperation({
    summary: "List the caller's transactions, filtered and paginated",
  })
  @ApiOkResponse({
    description: 'One page of transactions',
    type: PaginatedTransactionsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed on the query params',
    type: ErrorResponseDto,
  })
  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: GetTransactionsQueryDto,
  ): Promise<PaginatedTransactionsReadModel> {
    // Split explicitly rather than passing the DTO through as `filters`: that is
    // what keeps TransactionFilters from silently acquiring page and limit.
    return this.queryBus.execute(
      new GetTransactionsQuery(
        userId,
        {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          type: query.type,
          categoryId: query.categoryId,
        },
        { page: query.page, limit: query.limit },
      ),
    );
  }

  /**
   * MUST stay declared above `@Get(':id')`. Nest registers routes in method
   * declaration order and Express matches first-registered-wins, so a `:id`
   * declared first would swallow the literal `summary` segment and 404.
   *
   * Returns the caller's income/expense totals for one calendar month, plus a
   * per-category breakdown.
   *
   * @param userId - Id of the authenticated user; the summary is scoped to it.
   * @param query - Validated query params (`TransactionSummaryQueryDto`):
   *   1-based `month` and `year`.
   * @returns The monthly summary (`TransactionSummaryReadModel`).
   */
  @ApiOperation({
    summary:
      "Monthly income/expense summary for the caller's transactions, " +
      'with a per-category breakdown',
  })
  @ApiOkResponse({
    description: 'Monthly summary',
    type: TransactionSummaryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed on the query params',
    type: ErrorResponseDto,
  })
  @Get('summary')
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionSummaryQueryDto,
  ): Promise<TransactionSummaryReadModel> {
    return this.queryBus.execute(
      new GetTransactionSummaryQuery(userId, query.month, query.year),
    );
  }

  /**
   * Fetches a single transaction owned by the caller.
   *
   * @param userId - Id of the authenticated user; the lookup is scoped to it.
   * @param id - Transaction id from the route param.
   * @returns The matching transaction (`TransactionReadModel`).
   * @throws {NotFoundException} `id` does not exist or belongs to another user
   *   (raised by `GetTransactionByIdHandler`).
   */
  @ApiOperation({ summary: 'Fetch a single transaction owned by the caller' })
  @ApiOkResponse({
    description: 'The matching transaction',
    type: TransactionResponseDto,
  })
  @ApiNotFoundResponse({
    description: '`id` does not exist or belongs to another user',
    type: ErrorResponseDto,
  })
  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<TransactionReadModel> {
    return this.queryBus.execute(new GetTransactionByIdQuery(id, userId));
  }

  /**
   * Partially updates a transaction owned by the caller.
   *
   * @param userId - Id of the authenticated user; the lookup is scoped to it.
   * @param id - Transaction id from the route param.
   * @param dto - Validated request body (`UpdateTransactionDto`); every field
   *   is optional, so only the fields present are changed.
   * @returns The updated transaction (`TransactionReadModel`).
   * @throws {NotFoundException} `id` does not exist or belongs to another
   *   user, or `dto.categoryId` does not exist or belongs to another user
   *   (raised by `UpdateTransactionHandler`).
   */
  @ApiOperation({
    summary: 'Partially update a transaction owned by the caller',
  })
  @ApiOkResponse({
    description: 'The updated transaction',
    type: TransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed on the request body',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      '`id` does not exist or belongs to another user, or `categoryId` ' +
      'does not exist or belongs to another user',
    type: ErrorResponseDto,
  })
  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionReadModel> {
    return this.commandBus.execute(
      new UpdateTransactionCommand(
        id,
        userId,
        dto.amount,
        dto.type,
        dto.date,
        dto.categoryId,
        dto.description,
      ),
    );
  }

  /**
   * Deletes a transaction owned by the caller.
   *
   * @param userId - Id of the authenticated user; the lookup is scoped to it.
   * @param id - Transaction id from the route param.
   * @returns Nothing; responds `204 No Content` on success.
   * @throws {NotFoundException} `id` does not exist or belongs to another user
   *   (raised by `RemoveTransactionHandler`).
   */
  @ApiOperation({ summary: 'Delete a transaction owned by the caller' })
  @ApiNoContentResponse({ description: 'Transaction deleted' })
  @ApiNotFoundResponse({
    description: '`id` does not exist or belongs to another user',
    type: ErrorResponseDto,
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commandBus.execute(new RemoveTransactionCommand(id, userId));
  }
}
