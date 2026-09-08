import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionsRepository } from '../transactions.repository';
import { toTransactionReadModel } from '../transaction.mapper';
import { GetTransactionByIdQuery, TransactionReadModel } from '../contracts';

/**
 * Throws rather than returning null: unlike GetCategoryByIdQuery — a probe for
 * another module's decision — this query *is* the request, so the controller
 * stays a one-liner.
 */
@QueryHandler(GetTransactionByIdQuery)
export class GetTransactionByIdHandler implements IQueryHandler<
  GetTransactionByIdQuery,
  TransactionReadModel
> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(query: GetTransactionByIdQuery): Promise<TransactionReadModel> {
    const transaction = await this.transactionsRepository.findByIdForUser(
      query.id,
      query.userId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return toTransactionReadModel(transaction);
  }
}
