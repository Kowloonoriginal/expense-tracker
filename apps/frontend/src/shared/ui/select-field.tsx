'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

interface SelectFieldProps extends ComponentProps<'select'> {
  label: string;
  error?: string;
  children: ReactNode;
}

/**
 * A native `<select>` wrapped like FormField, for the same reason FormField is
 * hand-written: react-hook-form's `register()` spreads name/onChange/onBlur/ref
 * onto a real form control, and Base UI's Select is not one — it would need a
 * Controller and an API this project has not verified.
 */
export function SelectField({
  label,
  error,
  id,
  name,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const selectId = id ?? name;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={selectId}>{label}</Label>
      <select
        id={selectId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cn(
          'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
