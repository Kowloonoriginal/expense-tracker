'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Огляд' },
  { href: '/transactions', label: 'Транзакції' },
  { href: '/categories', label: 'Категорії' },
];

/** The white pill switcher from the reference; the active tab lights up lime. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="paper flex items-center gap-1 rounded-full bg-background p-1 shadow-[0_0_0_4px_var(--color-card)]">
      {LINKS.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-primary font-semibold text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
