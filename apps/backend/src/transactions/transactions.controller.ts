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
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetTransactionsQueryDto } from './dto/get-transactions.query.dto';
import { TransactionSummaryQueryDto } from './dto/transaction-summary.query.dto';
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
 */
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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
   */
  @Get('summary')
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionSummaryQueryDto,
  ): Promise<TransactionSummaryReadModel> {
    return this.queryBus.execute(
      new GetTransactionSummaryQuery(userId, query.month, query.year),
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<TransactionReadModel> {
    return this.queryBus.execute(new GetTransactionByIdQuery(id, userId));
  }

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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commandBus.execute(new RemoveTransactionCommand(id, userId));
  }
}
