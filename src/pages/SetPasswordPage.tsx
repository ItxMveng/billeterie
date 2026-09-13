import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, CheckCircle2, ShieldQuestion } from 'lucide-react';
import { setPasswordSchema, type SetPasswordValues } from '@/schemas/auth.schema';
import { useAuth } from '@/features/auth/useAuth';
import { clearAuthFlow, peekAuthFlow } from '@/features/auth/auth-flow';
import { AppError } from '@/lib/errors';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/**
 * Définition du mot de passe après une invitation ou une réinitialisation.
 *
 * Le lien reçu par email ouvre l'application avec une session déjà établie
 * (jeton dans le fragment d'URL, consommé par le client Supabase). Il reste à
 * choisir un mot de passe : c'est ce que fait cette page.
 */
export function SetPasswordPage() {
  const { loading, isAuthenticated, user, roles, updatePassword, configured } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const flow = peekAuthFlow();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updatePassword(values.password);
      clearAuthFlow();
      if (roles.length > 0) {
        navigate('/dashboard', { replace: true });
      } else {
        setDone(true); // compte valide mais sans rôle attribué
      }
    } catch (e) {
      setFormError(
        e instanceof AppError ? e.userMessage : 'Impossible de définir le mot de passe.',
      );
    }
  });

  if (loading) return <FullPageLoader label="Vérification du lien…" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-glow">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">
            {flow === 'recovery' ? 'Nouveau mot de passe' : 'Bienvenue dans l\'équipe'}
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            {flow === 'recovery'
              ? 'Choisissez un nouveau mot de passe pour votre compte.'
              : 'Choisissez un mot de passe pour activer votre accès.'}
          </p>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-soft">
          {!configured && (
            <Alert tone="warning">Service indisponible : configuration manquante.</Alert>
          )}

          {/* Lien expiré ou déjà utilisé */}
          {configured && !isAuthenticated && (
            <div className="space-y-4">
              <Alert tone="error" title="Lien invalide ou expiré">
                Ce lien d'invitation n'est plus valable. Les liens Supabase
                expirent après un délai limité et ne peuvent servir qu'une fois.
              </Alert>
              <p className="text-sm text-navy-600">
                Demandez à un administrateur de vous renvoyer une invitation,
                puis ouvrez le lien depuis le même appareil.
              </p>
              <Link
                to="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-navy-200 px-4 text-sm font-semibold text-navy-800 hover:bg-navy-50"
              >
                Aller à la connexion
              </Link>
            </div>
          )}

          {/* Succès sans rôle attribué */}
          {done && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-navy-900">
                Mot de passe enregistré
              </h2>
              <Alert tone="info" title="Accès pas encore activé">
                Votre compte est créé, mais <strong>aucun rôle</strong> ne lui est
                encore attribué. Un super-administrateur doit vous en donner un
                depuis « Administrateurs » pour que vous puissiez accéder au
                tableau de bord.
              </Alert>
              <p className="text-xs text-navy-500">
                Communiquez-lui votre email : {user?.email}
              </p>
            </div>
          )}

          {/* Formulaire */}
          {configured && isAuthenticated && !done && (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <p className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-700">
                Compte : <strong>{user?.email}</strong>
              </p>

              <Field
                label="Mot de passe"
                required
                error={errors.password?.message}
                hint="8 caractères minimum."
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="password"
                    autoComplete="new-password"
                    aria-describedby={describedBy}
                    invalid={Boolean(errors.password)}
                    {...register('password')}
                  />
                )}
              </Field>

              <Field label="Confirmer le mot de passe" required error={errors.confirm?.message}>
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="password"
                    autoComplete="new-password"
                    aria-describedby={describedBy}
                    invalid={Boolean(errors.confirm)}
                    {...register('confirm')}
                  />
                )}
              </Field>

              {formError && <Alert tone="error">{formError}</Alert>}

              <Button type="submit" className="w-full" loading={isSubmitting}>
                Enregistrer et continuer
              </Button>
            </form>
          )}
        </div>

        {!isAuthenticated && !done && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-navy-500">
            <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
            Ouvrez le lien sur le même appareil que celui où vous l'avez reçu.
          </p>
        )}
      </div>
    </div>
  );
}
