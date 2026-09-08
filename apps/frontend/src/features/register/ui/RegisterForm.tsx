'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { FormField } from '@/shared/ui/form-field';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  authErrorMessage,
  register as registerUser,
  useRedirectIfAuthenticated,
  useSession,
} from '@/entities/session';
import { registerSchema, type RegisterFormValues } from '../model/schema';

export function RegisterForm() {
  const router = useRouter();
  const { startSession } = useSession();
  const { isChecking } = useRedirectIfAuthenticated();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Without a default the checkbox starts uncontrolled, and an absent value
    // would fail zod's type check before the consent message can be reached.
    defaultValues: { consent: false },
  });

  // `consent` is a client-side gate, so the fields are picked explicitly rather
  // than leaning on the backend's whitelist to drop it.
  async function onSubmit({ email, name, password }: RegisterFormValues) {
    setServerError(null);
    try {
      startSession(await registerUser({ email, name, password }));
      router.push('/');
    } catch (err) {
      setServerError(authErrorMessage(err));
    }
  }

  // Already signed in: the redirect is running, so skip the form entirely.
  if (isChecking) return null;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Зареєструватися</CardTitle>
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
            label="Ім'я"
            type="text"
            error={errors.name?.message}
            {...register('name')}
          />
          <FormField
            label="Пароль"
            type="password"
            revealable
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="grid gap-1.5">
            <div className="flex items-start gap-2">
              <Controller
                name="consent"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="consent"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.consent}
                    aria-describedby={
                      errors.consent ? 'consent-error' : undefined
                    }
                    className="mt-0.5"
                  />
                )}
              />
              {/* `block` overrides Label's flex, which would otherwise turn the
                  sentence and its links into separate flex items. */}
              <Label
                htmlFor="consent"
                className="block text-sm leading-snug font-normal text-muted-foreground"
              >
                Я погоджуюся з{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  // The label toggles the checkbox on click; without this, opening
                  // a document would flip the consent too.
                  onClick={(event) => event.stopPropagation()}
                  className="text-primary underline underline-offset-4"
                >
                  Умовами користування
                </Link>{' '}
                та{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-primary underline underline-offset-4"
                >
                  Політикою обробки персональних даних
                </Link>
              </Label>
            </div>
            {errors.consent && (
              <p id="consent-error" className="text-sm text-destructive">
                {errors.consent.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Реєстрація...' : 'Зареєструватися'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Вже маєте акаунт?{' '}
          <Link
            href="/login"
            className="text-primary underline underline-offset-4"
          >
            Увійти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
