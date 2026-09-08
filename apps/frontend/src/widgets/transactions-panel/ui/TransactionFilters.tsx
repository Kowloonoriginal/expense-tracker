'use client';

import type { Category, TransactionFiltersDto } from '@repo/shared';
import { TYPE_LABEL } from '@/entities/transaction';
import { SelectField } from '@/shared/ui/select-field';
import { FormField } from '@/shared/ui/form-field';
import { Button } from '@/shared/ui/button';

interface TransactionFiltersProps {
  filters: TransactionFiltersDto;
  categories: Category[];
  onChange: (filters: TransactionFiltersDto) => void;
}

/**
 * Four controls with no submit, mutating state the panel already owns — so they
 * stay inside the widget rather than becoming a feature slice. Promote them the
 * moment they grow saved presets or URL sync.
 */
export function TransactionFilters({
  filters,
  categories,
  onChange,
}: TransactionFiltersProps) {
  const hasAny = Object.values(filters).some(Boolean);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <SelectField
        label="Тип"
        value={filters.type ?? ''}
        onChange={(event) =>
          onChange({
            ...filters,
            // '' means "no filter"; buildTransactionsQuery drops it so the
            // backend's @IsEnum never sees an empty string.
            type: (event.target.value ||
              undefined) as TransactionFiltersDto['type'],
          })
        }
      >
        <option value="">Усі</option>
        <option value="EXPENSE">{TYPE_LABEL.EXPENSE}</option>
        <option value="INCOME">{TYPE_LABEL.INCOME}</option>
      </SelectField>

      <SelectField
        label="Категорія"
        value={filters.categoryId ?? ''}
        onChange={(event) =>
          onChange({ ...filters, categoryId: event.target.value || undefined })
        }
      >
        <option value="">Усі</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>

      <FormField
        label="Від"
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={(event) =>
          onChange({ ...filters, dateFrom: event.target.value || undefined })
        }
      />
      <FormField
        label="До"
        type="date"
        value={filters.dateTo ?? ''}
        onChange={(event) =>
          onChange({ ...filters, dateTo: event.target.value || undefined })
        }
      />

      <Button
        variant="ghost"
        size="sm"
        disabled={!hasAny}
        onClick={() => onChange({})}
      >
        Скинути
      </Button>
    </div>
  );
}
