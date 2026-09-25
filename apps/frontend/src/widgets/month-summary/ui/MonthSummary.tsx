'use client';

import type { CategorySummary } from '@repo/shared';
import { useSummary, TYPE_LABEL } from '@/entities/transaction';
import { useSession } from '@/entities/session';
import { toMessage } from '@/shared/api/error-message';
import { formatAmount } from '@/shared/lib/format';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

const MONTHS = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
];

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-2 truncate text-3xl font-medium tracking-tight tabular-nums sm:text-[2.1rem] ${accent ?? ''}`}
      >
        {value}
      </p>
    </div>
  );
}

export function MonthSummary() {
  const { user } = useSession();
  const currency = user?.currency ?? 'UAH';

  // The backend defines the month in UTC; asking with the local month keeps the
  // two in step for every timezone at or east of UTC, which covers this app.
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data, error, isLoading } = useSummary(month, year);

  // Largest contributors first — the backend already orders by summed amount.
  const top: CategorySummary[] = (data?.byCategory ?? []).slice(0, 5);
  const largest = top.length > 0 ? Math.max(...top.map((row) => row.total)) : 0;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">Поточний місяць</p>
        <CardTitle className="text-4xl font-medium tracking-tight sm:text-5xl">
          {MONTHS[month - 1]} {year}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{toMessage(error)}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-3">
              <SummaryStat
                label="Доходи"
                value={formatAmount(data?.income ?? 0, currency)}
                accent="text-income"
              />
              <SummaryStat
                label="Витрати"
                value={formatAmount(data?.expense ?? 0, currency)}
              />
              <SummaryStat
                label="Баланс"
                value={formatAmount(data?.balance ?? 0, currency)}
                accent={
                  (data?.balance ?? 0) < 0 ? 'text-destructive' : undefined
                }
              />
            </div>

            {top.length > 0 && (
              <ul className="grid gap-4 rounded-2xl bg-background/60 p-5 sm:grid-cols-2 sm:gap-x-8">
                {top.map((row) => (
                  <li
                    key={`${row.categoryId}-${row.type}`}
                    className="grid gap-2"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="truncate">{row.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {TYPE_LABEL[row.type]}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {formatAmount(row.total, currency)}
                      </span>
                    </div>
                    {/* Hatched lime track, as in the reference's payout bars. */}
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary bg-[repeating-linear-gradient(-45deg,transparent_0_4px,rgb(0_0_0/12%)_4px_6px)]"
                        style={{
                          width: `${largest ? (row.total / largest) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
