import { cn } from '@/shared/lib/utils';

interface CategoryBadgeProps {
  name: string;
  /** Hex from the API — the --chart-* tokens are greyscale ramps, so they can't serve here. */
  color: string;
  className?: string;
}

export function CategoryBadge({ name, color, className }: CategoryBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
