'use client';

import type { CategorySummary } from '@repo/shared';
import { getSummary, TYPE_LABEL } from '@/entities/transaction';
import { useSession } from '@/entities/session';
import { useAsync } from '@/shared/lib/use-async';
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
    <div className="rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? ''}`}>
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

  const { data, error, isLoading } = useAsync(
    () => getSummary(month, year),
    [month, year],
  );

  // Largest contributors first — the backend already orders by summed amount.
  const top: CategorySummary[] = (data?.byCategory ?? []).slice(0, 5);
  const largest = top.length > 0 ? Math.max(...top.map((row) => row.total)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {MONTHS[month - 1]} {year}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryStat
                label="Доходи"
                value={formatAmount(data?.income ?? 0, currency)}
                accent="text-emerald-600"
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
              <ul className="grid gap-2">
                {top.map((row) => (
                  <li
                    key={`${row.categoryId}-${row.type}`}
                    className="grid gap-1"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">
                        {row.name}
                        <span className="ml-2 text-muted-foreground">
                          {TYPE_LABEL[row.type]}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {formatAmount(row.total, currency)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${largest ? (row.total / largest) * 100 : 0}%`,
                          // Colour comes from the category, not --chart-*, which
                          // are greyscale ramps in this theme.
                          backgroundColor: row.color,
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
