'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/entities/session';
import { Button, buttonVariants } from '@/shared/ui/button';

export function Header() {
  const { user, isLoading, endSession } = useSession();
  const router = useRouter();

  function handleLogout() {
    endSession();
    router.push('/login');
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <Link href="/" className="font-heading text-sm font-medium">
        Expense Tracker
      </Link>

      {/* Nothing session-dependent renders until localStorage has been read. */}
      {!isLoading &&
        (user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Вийти
            </Button>
          </div>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Увійти
          </Link>
        ))}
    </header>
  );
}
