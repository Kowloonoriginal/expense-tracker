'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  authErrorMessage,
  login,
  useRedirectIfAuthenticated,
  useSession,
} from '@/entities/session';
import { loginSchema, type LoginFormValues } from '../model/schema';

export function LoginForm() {
  const { startSession } = useSession();
  const { isChecking } = useRedirectIfAuthenticated();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      // No router.push here: startSession flips `user`, which is exactly
      // what useRedirectIfAuthenticated above is watching for — it owns the
      // post-login destination. Pushing here too raced it and could flash
      // the public landing page for a frame before being replaced.
      startSession(await login(values));
    } catch (err) {
      setServerError(authErrorMessage(err));
    }
  }

  // Already signed in: the redirect is running, so skip the form entirely.
  if (isChecking) return null;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Увійти</CardTitle>
      </CardHeader>
      <CardContent>
        {serverError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="grid gap-4"
        >
          <FormField
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <FormField
            label="Пароль"
            type="password"
            revealable
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Вхід...' : 'Увійти'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Немає акаунта?{' '}
          <Link
            href="/register"
            className="text-primary underline underline-offset-4"
          >
            Зареєструватися
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
