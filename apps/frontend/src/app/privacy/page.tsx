import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Політика обробки персональних даних — Трекер витрат',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">
        Політика обробки персональних даних
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Текст документа ще не додано. Сторінку створено як призначення для
        посилання у формі реєстрації — вміст потрібно замінити реальною
        політикою обробки персональних даних.
      </p>
    </main>
  );
}
