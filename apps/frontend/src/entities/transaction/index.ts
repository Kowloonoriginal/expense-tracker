/**
 * Public surface of the transaction entity. `buildTransactionsQuery` and
 * `TransactionAmount` stay internal — used only by `api/transactions-api.ts`
 * and `ui/TransactionRow.tsx` respectively, both inside this entity.
 */
export {
  getTransactions,
  createTransaction,
  getSummary,
} from './api/transactions-api';
export { TYPE_LABEL } from './model/transaction-labels';
export { TransactionRow } from './ui/TransactionRow';
