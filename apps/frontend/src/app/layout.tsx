import type { Metadata } from 'next';
import './globals.css';
import { Manrope } from 'next/font/google';
import { cn } from '@/shared/lib/utils';
import { QueryProvider } from '@/shared/api/query-provider';
import { SessionProvider } from '@/entities/session';
import { Header } from '@/widgets/header';

const manrope = Manrope({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Трекер витрат',
  description: 'Записуйте доходи й витрати та стежте за балансом щомісяця',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={cn('font-sans', manrope.variable)}>
      <body className="flex min-h-screen flex-col">
        <QueryProvider>
          <SessionProvider>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
