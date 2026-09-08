import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TransactionsRepository } from '../transactions.repository';
import { RemoveTransactionCommand } from '../contracts';

@CommandHandler(RemoveTransactionCommand)
export class RemoveTransactionHandler implements ICommandHandler<
  RemoveTransactionCommand,
  void
> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(command: RemoveTransactionCommand): Promise<void> {
    const existing = await this.transactionsRepository.findByIdForUser(
      command.id,
      command.userId,
    );

    if (!existing) {
      // Same 404 for an unknown id and for another user's transaction.
      throw new NotFoundException('Transaction not found');
    }

    await this.transactionsRepository.delete(command.id);
  }
}
