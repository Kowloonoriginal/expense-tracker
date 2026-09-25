import Link from 'next/link';
import { buttonVariants } from '@/shared/ui/button';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-sm text-muted-foreground">Доходи · витрати · баланс</p>
      <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[1.05] sm:text-7xl">
        Кожна гривня — <span className="text-primary">на своєму місці</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Записуйте доходи й витрати та стежте за балансом щомісяця
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/register" className={buttonVariants({ size: 'lg' })}>
          Створити акаунт
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ variant: 'outline', size: 'lg' })}
        >
          Увійти
        </Link>
      </div>
    </main>
  );
}
