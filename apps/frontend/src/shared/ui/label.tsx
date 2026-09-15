'use client';

import * as React from 'react';

import { cn } from '@/shared/lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    /* eslint-disable-next-line jsx-a11y/label-has-associated-control --
       this is the generic UI-kit primitive; `htmlFor` arrives via `...props`
       at call sites (form-field.tsx, select-field.tsx), which the rule can't
       see through a spread. Actual call sites are still checked when they
       inline a <label>. */
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
