import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { CreateTransactionHandler } from './handlers/create-transaction.handler';
import { GetTransactionsHandler } from './handlers/get-transactions.handler';
import { GetTransactionByIdHandler } from './handlers/get-transaction-by-id.handler';
import { GetTransactionSummaryHandler } from './handlers/get-transaction-summary.handler';
import { UpdateTransactionHandler } from './handlers/update-transaction.handler';
import { RemoveTransactionHandler } from './handlers/remove-transaction.handler';

const handlers = [
  CreateTransactionHandler,
  GetTransactionsHandler,
  GetTransactionByIdHandler,
  GetTransactionSummaryHandler,
  UpdateTransactionHandler,
  RemoveTransactionHandler,
];

/**
 * Exports nothing: other modules reach this one through the buses, using the
 * classes in ./contracts. CqrsModule.forRoot() in AppModule makes the buses
 * available here without a local import.
 */
@Module({
  controllers: [TransactionsController],
  providers: [TransactionsRepository, ...handlers],
})
export class TransactionsModule {}
