import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import {
  CategoryReadModel,
  GetCategoryByIdQuery,
} from '@/categories/contracts';
import { TransactionsRepository } from '../transactions.repository';
import {
  normalizeDescription,
  toTransactionReadModel,
} from '../transaction.mapper';
import { CreateTransactionCommand, TransactionReadModel } from '../contracts';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler implements ICommandHandler<
  CreateTransactionCommand,
  TransactionReadModel
> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    command: CreateTransactionCommand,
  ): Promise<TransactionReadModel> {
    // The foreign key proves the category exists, not who owns it — without this
    // check a user could attach somebody else's category to their ledger.
    const category = await this.queryBus.execute<
      GetCategoryByIdQuery,
      CategoryReadModel | null
    >(new GetCategoryByIdQuery(command.categoryId, command.userId));

    if (!category) {
      // The same 404 for an unknown category and for another user's — identical
      // to what PATCH /categories/:id already returns, so no new oracle appears.
      throw new NotFoundException('Category not found');
    }

    const transaction = await this.transactionsRepository.create({
      userId: command.userId,
      categoryId: command.categoryId,
      type: command.type,
      date: new Date(command.date),
      amount: new Prisma.Decimal(command.amount),
      description: normalizeDescription(command.description) ?? null,
    });

    return toTransactionReadModel(transaction);
  }
}
