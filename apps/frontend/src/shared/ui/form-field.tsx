'use client';

import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
  /** Adds an eye toggle that switches the field between password and plain text. */
  revealable?: boolean;
}

/** Label + Input + inline error text. React 19 passes `ref` through `...props` — no forwardRef needed. */
export function FormField({
  label,
  error,
  revealable = false,
  id,
  name,
  type,
  className,
  ...props
}: FormFieldProps) {
  const inputId = id ?? name;
  const [revealed, setRevealed] = useState(false);
  const RevealIcon = revealed ? EyeOff : Eye;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          name={name}
          type={revealable && revealed ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(revealable && 'pr-9', className)}
          {...props}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? 'Сховати пароль' : 'Показати пароль'}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <RevealIcon className="size-4" />
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
