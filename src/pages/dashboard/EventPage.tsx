import { useEffect, useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { EventService } from '@/features/events/EventService';
import { AppError } from '@/lib/errors';
import { formatMoney } from '@/lib/utils';
import { EventStatus } from '@/types/enums';
import type { EventRow } from '@/types/database';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/** Convertit des euros saisis ("25" ou "25,50") en centimes entiers. */
function eurosToCents(value: string): number {
  const normalized = value.replace(',', '.').trim();
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}
const centsToEuros = (c: number) => (c / 100).toFixed(2);

interface FormState {
  name: string;
  date: string;
  location: string;
  alumniEuros: string;
  otherEuros: string;
  currency: string;
  status: EventStatus;
}

const EMPTY: FormState = {
  name: '',
  date: '',
  location: '',
  alumniEuros: '25.00',
  otherEuros: '25.00',
  currency: 'EUR',
  status: EventStatus.PUBLISHED,
};

function toForm(row: EventRow): FormState {
  return {
    name: row.name,
    date: row.date,
    location: row.location ?? '',
    alumniEuros: centsToEuros(row.alumni_price_cents),
    otherEuros: centsToEuros(row.other_price_cents),
    currency: row.currency,
    status: row.status,
  };
}

export function EventPage() {
  const { can } = useAuth();
  const canWrite = can('events:write');
  const { data, loading, error, reload } = useAsync(() => EventService.listAll(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Sélectionne le premier événement dès que la liste arrive.
  useEffect(() => {
    if (!data || data.length === 0 || selectedId) return;
    const first = data[0]!;
    setSelectedId(first.id);
    setForm(toForm(first));
  }, [data, selectedId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setMessage(null);

    if (!form.name.trim() || !form.date) {
      setFormError("Le nom et la date sont obligatoires.");
      return;
    }

    const patch = {
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim() || null,
      alumni_price_cents: eurosToCents(form.alumniEuros),
      other_price_cents: eurosToCents(form.otherEuros),
      currency: form.currency.trim().toUpperCase() || 'EUR',
      status: form.status,
    };

    setBusy(true);
    try {
      if (selectedId) {
        await EventService.update(selectedId, patch);
        setMessage('Événement mis à jour. Les nouveaux prix sont visibles immédiatement.');
      } else {
        const created = await EventService.create(patch);
        setSelectedId(created.id);
        setMessage('Événement créé et publié.');
      }
      reload();
    } catch (err) {
      setFormError(
        err instanceof AppError ? err.userMessage : "Enregistrement impossible.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Événement</h1>
        <p className="mt-1 text-sm text-slate-600">
          Nom, date, lieu et <strong>tarifs</strong>. Les montants sont saisis en
          euros et convertis en centimes pour la base.
        </p>
      </header>

      {!canWrite && (
        <Alert tone="warning">
          Consultation seule : la modification est réservée aux administrateurs.
        </Alert>
      )}
      {formError && <Alert tone="error">{formError}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {(data?.length ?? 0) > 1 && (
            <Select
              aria-label="Choisir l'événement"
              className="max-w-sm"
              value={selectedId ?? ''}
              onChange={(e) => {
                const row = data!.find((r) => r.id === e.target.value);
                setSelectedId(row?.id ?? null);
                if (row) setForm(toForm(row));
              }}
            >
              {data!.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {ev.date}
                </option>
              ))}
            </Select>
          )}

          {(data?.length ?? 0) === 0 && (
            <Alert tone="info" title="Aucun événement">
              Créez l'événement ci-dessous : il deviendra immédiatement visible
              sur la page publique une fois publié.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{selectedId ? "Modifier l'événement" : 'Créer un événement'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
                <Field label="Nom de l'événement" required className="sm:col-span-2">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={form.name}
                      disabled={!canWrite}
                      onChange={(e) => set('name', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Date" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      type="date"
                      value={form.date}
                      disabled={!canWrite}
                      onChange={(e) => set('date', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Lieu">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={form.location}
                      disabled={!canWrite}
                      onChange={(e) => set('location', e.target.value)}
                    />
                  )}
                </Field>

                <Field
                  label="Prix ancien étudiant (€)"
                  hint={`Actuellement : ${formatMoney(eurosToCents(form.alumniEuros), form.currency)}`}
                >
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      inputMode="decimal"
                      aria-describedby={describedBy}
                      value={form.alumniEuros}
                      disabled={!canWrite}
                      onChange={(e) => set('alumniEuros', e.target.value)}
                    />
                  )}
                </Field>

                <Field
                  label="Prix invité / autre (€)"
                  hint={`Actuellement : ${formatMoney(eurosToCents(form.otherEuros), form.currency)}`}
                >
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      inputMode="decimal"
                      aria-describedby={describedBy}
                      value={form.otherEuros}
                      disabled={!canWrite}
                      onChange={(e) => set('otherEuros', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Devise">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={form.currency}
                      disabled={!canWrite}
                      onChange={(e) => set('currency', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Statut" hint="Seul PUBLISHED est visible du public.">
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={form.status}
                      disabled={!canWrite}
                      onChange={(e) => set('status', e.target.value as EventStatus)}
                    >
                      {Object.values(EventStatus).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  )}
                </Field>

                {canWrite && (
                  <div className="sm:col-span-2">
                    <Button type="submit" loading={busy}>
                      {selectedId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {selectedId ? 'Enregistrer' : "Créer l'événement"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-400">
            Les prix affichés au public sont indicatifs ; le montant facturé est
            recalculé côté serveur à la création de chaque paiement.
          </p>
        </>
      )}
    </div>
  );
}
