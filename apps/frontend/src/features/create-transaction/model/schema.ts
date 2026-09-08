import { z } from 'zod';

/** Mirrors CreateTransactionDto's class-validator rules, message for message. */
export const createTransactionSchema = z.object({
  amount: z
    .number({ message: 'Введіть суму' })
    .positive('Сума має бути більшою за нуль')
    .max(9_999_999_999.99, 'Сума завелика')
    .refine(
      (value) => Number.isInteger(Math.round(value * 100)),
      'Не більше двох знаків після коми',
    ),
  type: z.enum(['INCOME', 'EXPENSE'], { message: 'Оберіть тип' }),
  description: z
    .string()
    .max(255, 'Опис має містити не більше 255 символів')
    .optional(),
  date: z.string().min(1, 'Оберіть дату'),
  categoryId: z.string().min(1, 'Оберіть категорію'),
});

export type CreateTransactionValues = z.infer<typeof createTransactionSchema>;
