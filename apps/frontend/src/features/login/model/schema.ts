import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email є обов'язковим")
    .email('Введіть коректний email'),
  password: z.string().min(1, "Пароль є обов'язковим"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
