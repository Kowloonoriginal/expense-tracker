'use client';

import { Button } from '@/shared/ui/button';

interface TransactionsPagerProps {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function TransactionsPager({
  page,
  totalPages,
  total,
  onChange,
}: TransactionsPagerProps) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Сторінка {page} з {totalPages} · усього {total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Далі
        </Button>
      </div>
    </div>
  );
}
