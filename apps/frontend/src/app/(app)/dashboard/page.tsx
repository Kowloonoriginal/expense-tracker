import { MonthSummary } from '@/widgets/month-summary';
import { TransactionsPanel } from '@/widgets/transactions-panel';
import { UserProfileCard } from '@/widgets/user-profile-card';

export default function DashboardPage() {
  return (
    <>
      <UserProfileCard />
      <MonthSummary />
      <TransactionsPanel title="Останні транзакції" />
    </>
  );
}
