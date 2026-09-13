import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import {
  registrationSchema,
  type RegistrationInput,
} from '@/schemas/participant.schema';
import {
  ParticipantType,
  PARTICIPANT_TYPE_LABELS,
} from '@/types/enums';
import { requiresSchool, getPaymentRequirement } from './participant.logic';
import { ParticipantService, type RegistrationResult } from './ParticipantService';
import { SchoolService } from '@/features/schools/SchoolService';
import { EventService, type ResolvedEvent } from '@/features/events/EventService';
import { PaymentService } from '@/features/payments/PaymentService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { formatMoney } from '@/lib/utils';
import type { SchoolRow } from '@/types/database';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const TYPE_OPTIONS = [
  ParticipantType.NEW_STUDENT,
  ParticipantType.ALUMNI,
  ParticipantType.OTHER,
] as const;

const TYPE_HINTS: Record<ParticipantType, string> = {
  NEW_STUDENT: 'Participation gratuite, sous réserve de vérification.',
  ALUMNI: 'Participation payante. Ancienne école requise.',
  OTHER: 'Participation payante.',
};

export function RegistrationForm() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [event, setEvent] = useState<ResolvedEvent | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      participant_type: undefined,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      school_id: undefined,
    },
  });

  const selectedType = watch('participant_type');

  useEffect(() => {
    void SchoolService.listActive().then(setSchools);
    void EventService.getActiveEvent().then(setEvent);
  }, []);

  const onSubmit = handleSubmit(async (raw) => {
    setSubmitError(null);
    // Re-validation stricte → valeurs transformées (email en minuscules, etc.).
    const values = registrationSchema.parse(raw);
    try {
      const res = await ParticipantService.register(values, event?.id ?? null);
      // Le token est le seul moyen de retrouver son billet : on le conserve
      // localement (confort) mais l'utilisateur est invité à garder le lien.
      try {
        localStorage.setItem('portal_token', res.accessToken);
      } catch {
        /* stockage indisponible : le lien affiché reste la source */
      }
      setResult(res);
    } catch (e) {
      setSubmitError(
        e instanceof AppError
          ? e.userMessage
          : 'Une erreur est survenue. Réessayez plus tard.',
      );
    }
  });

  if (result) {
    const portalPath = `/mon-billet?t=${encodeURIComponent(result.accessToken)}`;
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 sm:p-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-green-900">
            Inscription enregistrée
          </h2>
        </div>
        <div className="mt-4 space-y-3 text-sm text-green-900">
          {result.paymentRequired ? (
            <p>
              Votre participation est payante. Un paiement sera à effectuer via
              Wero (référence{' '}
              <strong className="font-mono">{result.paymentReference}</strong>).
              Suivez les instructions et confirmez votre paiement depuis votre
              espace ci-dessous.
            </p>
          ) : (
            <p>
              Votre participation est gratuite (sous réserve de vérification pour
              les nouveaux étudiants). Suivez l'état de votre inscription depuis
              votre espace.
            </p>
          )}
          <Alert tone="warning">
            <strong>Conservez ce lien privé</strong> — c'est le seul accès à
            votre billet et au suivi de votre inscription :
            <div className="mt-2 break-all rounded bg-white/70 p-2 font-mono text-xs">
              {window.location.origin}
              {portalPath}
            </div>
          </Alert>
          <div className="pt-1 text-center">
            <Link
              to={portalPath}
              className="inline-flex h-11 items-center rounded-lg bg-brand-700 px-6 font-medium text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              Accéder à mon espace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Alert tone="warning" title="Inscription indisponible">
        Le service d'inscription n'est pas encore connecté à la base de données.
        Configurez Supabase (voir <code>.env.example</code>) pour l'activer.
      </Alert>
    );
  }

  const showSchool = selectedType && requiresSchool(selectedType);
  const paymentRequired = selectedType
    ? getPaymentRequirement({ participant_type: selectedType })
    : false;
  const displayAmount =
    selectedType && event
      ? PaymentService.getDisplayAmountCents(selectedType, event)
      : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* Étape 1 : catégorie */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">
          Vous êtes : <span className="text-red-600" aria-hidden="true">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer flex-col gap-1 rounded-lg border border-slate-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  value={type}
                  className="h-4 w-4 accent-brand-700"
                  {...register('participant_type')}
                />
                <span className="text-sm font-medium text-slate-900">
                  {PARTICIPANT_TYPE_LABELS[type]}
                </span>
              </span>
              <span className="text-xs text-slate-500">{TYPE_HINTS[type]}</span>
            </label>
          ))}
        </div>
        {errors.participant_type && (
          <p role="alert" className="text-sm text-red-600">
            {errors.participant_type.message}
          </p>
        )}
      </fieldset>

      {/* Étape 2 : informations */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" required error={errors.first_name?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              autoComplete="given-name"
              invalid={Boolean(errors.first_name)}
              {...register('first_name')}
            />
          )}
        </Field>
        <Field label="Nom" required error={errors.last_name?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              autoComplete="family-name"
              invalid={Boolean(errors.last_name)}
              {...register('last_name')}
            />
          )}
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="email"
              inputMode="email"
              aria-describedby={describedBy}
              autoComplete="email"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          )}
        </Field>
        <Field
          label="Téléphone"
          required
          error={errors.phone?.message}
          hint="Format international accepté, ex. +33 6 12 34 56 78"
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="tel"
              inputMode="tel"
              aria-describedby={describedBy}
              autoComplete="tel"
              invalid={Boolean(errors.phone)}
              {...register('phone')}
            />
          )}
        </Field>
      </div>

      {/* École conditionnelle (ALUMNI) */}
      {showSchool && (
        <Field
          label="Ancienne école"
          required
          error={errors.school_id?.message}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={Boolean(errors.school_id)}
              defaultValue=""
              {...register('school_id')}
            >
              <option value="" disabled>
                Sélectionnez votre ancienne école
              </option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.short_name ? ` (${s.short_name})` : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      {/* Rappel métier du paiement (indicatif, non fiable côté client) */}
      {selectedType && (
        <Alert tone={paymentRequired ? 'info' : 'success'}>
          {paymentRequired ? (
            <span>
              Participation payante
              {event && displayAmount > 0 && (
                <>
                  {' '}— montant indicatif{' '}
                  <strong>{formatMoney(displayAmount, event.currency)}</strong>
                </>
              )}
              . Le paiement (Wero) sera disponible prochainement ; le montant
              exact sera confirmé lors du paiement.
            </span>
          ) : (
            <span>
              Participation gratuite pour les nouveaux étudiants, sous réserve de
              vérification de votre statut.
            </span>
          )}
        </Alert>
      )}

      {submitError && <Alert tone="error">{submitError}</Alert>}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
        Envoyer mon inscription
      </Button>
    </form>
  );
}
