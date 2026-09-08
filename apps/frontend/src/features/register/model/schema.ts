import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email є обов'язковим")
    .email('Введіть коректний email'),
  name: z
    .string()
    .min(2, "Ім'я має містити щонайменше 2 символи")
    .max(60, "Ім'я має містити не більше 60 символів"),
  password: z
    .string()
    .min(8, 'Пароль має містити щонайменше 8 символів')
    .max(72, 'Пароль має містити не більше 72 символів'),
  // `.refine()` rather than `z.literal(true)`: it carries our own copy instead
  // of zod's built-in "invalid literal" wording.
  consent: z.boolean().refine((value) => value, {
    message: 'Потрібно погодитися з умовами, щоб продовжити',
  }),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
