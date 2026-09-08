'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/entities/session';
import { Button, buttonVariants } from '@/shared/ui/button';
import { MainNav } from './MainNav';

export function Header() {
  const { user, isLoading, endSession } = useSession();
  const router = useRouter();

  function handleLogout() {
    endSession();
    router.push('/login');
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Signed in, the logo leads to the app rather than the landing page. */}
        <Link
          href={user ? '/dashboard' : '/'}
          className="font-heading text-sm font-medium"
        >
          Expense Tracker
        </Link>
        {!isLoading && user && <MainNav />}
      </div>

      {/* Nothing session-dependent renders until localStorage has been read. */}
      {!isLoading &&
        (user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name}
            </span>
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
