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
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Signed in, the logo leads to the app rather than the landing page. */}
        <Link
          href={user ? '/dashboard' : '/'}
          className="flex items-center gap-2 font-heading text-base font-bold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-primary text-sm text-primary-foreground"
          >
            ₴
          </span>
          Трекер витрат
        </Link>
        {!isLoading && user && <MainNav />}
      </div>

      {/* Nothing session-dependent renders until localStorage has been read. */}
      {!isLoading &&
        (user ? (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border px-1 py-1 pr-4 text-sm sm:flex">
              <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </span>
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
