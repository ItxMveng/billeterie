import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { loginSchema, type LoginValues } from '@/schemas/auth.schema';
import { useAuth } from '@/features/auth/useAuth';
import { AppError } from '@/lib/errors';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { signIn, isAuthenticated, loading, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate(from, { replace: true });
    } catch (e) {
      setFormError(
        e instanceof AppError
          ? e.userMessage
          : 'Connexion impossible. Vérifiez vos identifiants.',
      );
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <BrandLogo size={56} rounded="rounded-2xl" className="mx-auto shadow-soft" />
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            Administration
          </h1>
          <p className="text-sm text-slate-500">Connectez-vous à votre espace.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {!configured && (
            <Alert tone="warning" className="mb-4">
              Supabase n'est pas configuré : la connexion est désactivée.
            </Alert>
          )}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Email" required error={errors.email?.message}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  aria-describedby={describedBy}
                  invalid={Boolean(errors.email)}
                  disabled={!configured}
                  {...register('email')}
                />
              )}
            </Field>
            <Field label="Mot de passe" required error={errors.password?.message}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  aria-describedby={describedBy}
                  invalid={Boolean(errors.password)}
                  disabled={!configured}
                  {...register('password')}
                />
              )}
            </Field>

            {formError && <Alert tone="error">{formError}</Alert>}

            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              disabled={!configured}
            >
              Se connecter
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-brand-700 hover:underline">
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
