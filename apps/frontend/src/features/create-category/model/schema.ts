import { z } from 'zod';

/** Mirrors CreateCategoryDto's class-validator rules, message for message. */
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Введіть назву')
    .max(40, 'Назва має містити не більше 40 символів'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Колір має бути у форматі #A3B1FF'),
  icon: z
    .string()
    .min(1, 'Введіть іконку')
    .max(40, 'Іконка має містити не більше 40 символів'),
});

export type CreateCategoryValues = z.infer<typeof createCategorySchema>;
