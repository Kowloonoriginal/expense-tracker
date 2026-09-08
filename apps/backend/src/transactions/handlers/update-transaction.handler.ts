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
import { TransactionReadModel, UpdateTransactionCommand } from '../contracts';

@CommandHandler(UpdateTransactionCommand)
export class UpdateTransactionHandler implements ICommandHandler<
  UpdateTransactionCommand,
  TransactionReadModel
> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    command: UpdateTransactionCommand,
  ): Promise<TransactionReadModel> {
    const existing = await this.transactionsRepository.findByIdForUser(
      command.id,
      command.userId,
    );

    if (!existing) {
      // Same 404 whether the id is unknown or owned by somebody else.
      throw new NotFoundException('Transaction not found');
    }

    // Only when the caller is actually moving the transaction to another
    // category — and after the check above, so a foreign transaction id fails
    // on the transaction rather than on the category.
    if (command.categoryId !== undefined) {
      const category = await this.queryBus.execute<
        GetCategoryByIdQuery,
        CategoryReadModel | null
      >(new GetCategoryByIdQuery(command.categoryId, command.userId));

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Undefined fields are ignored by Prisma, so a partial PATCH leaves the
    // rest of the row untouched.
    const updated = await this.transactionsRepository.update(command.id, {
      amount:
        command.amount === undefined
          ? undefined
          : new Prisma.Decimal(command.amount),
      type: command.type,
      date: command.date === undefined ? undefined : new Date(command.date),
      categoryId: command.categoryId,
      description: normalizeDescription(command.description),
    });

    return toTransactionReadModel(updated);
  }
}
