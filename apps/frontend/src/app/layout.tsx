import type { Metadata } from 'next';
import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/shared/lib/utils';
import { SessionProvider } from '@/entities/session';
import { Header } from '@/widgets/header';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track your expenses easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={cn('font-sans', geist.variable)}>
      <body className="flex min-h-screen flex-col">
        <SessionProvider>
          <Header />
          <div className="flex flex-1 flex-col">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
