import { useEffect, useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { EventService } from '@/features/events/EventService';
import { useDashboardEvent } from '@/features/events/DashboardEventContext';
import { AppError } from '@/lib/errors';
import { EVENT_STATUS_LABELS, EventStatus } from '@/types/enums';
import type { EventRow } from '@/types/database';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface FormState {
  name: string;
  date: string;
  location: string;
  /** Heure de début (HH:MM), vide si à confirmer. */
  startTime: string;
  status: EventStatus;
}

const EMPTY: FormState = {
  name: '',
  date: '',
  location: '',
  startTime: '',
  // Un nouvel événement est préparé en brouillon : il ne remplace pas
  // l'événement en cours tant qu'on ne le publie pas.
  status: EventStatus.DRAFT,
};

function toForm(row: EventRow): FormState {
  return {
    name: row.name,
    date: row.date,
    location: row.location ?? '',
    startTime: row.start_time?.slice(0, 5) ?? '',
    status: row.status,
  };
}

export function EventPage() {
  const { can } = useAuth();
  const canWrite = can('events:write');

  // L'événement modifié est celui choisi dans le bandeau du tableau de bord.
  const { events, event, setEventId, loading, reload } = useDashboardEvent();
  const [creating, setCreating] = useState(false);
  const selectedId = creating ? null : event?.id ?? null;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    setForm(!creating && event ? toForm(event) : EMPTY);
  }, [event, creating]);

  const otherPublished = events.filter(
    (e) => e.status === EventStatus.PUBLISHED && e.id !== selectedId,
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setMessage(null);

    if (!form.name.trim() || !form.date) {
      setFormError('Le nom et la date sont obligatoires.');
      return;
    }

    const patch = {
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim() || null,
      start_time: form.startTime || null,
      status: form.status,
    };

    setBusy(true);
    try {
      if (selectedId) {
        await EventService.update(selectedId, patch);
        await reload();
        setMessage('Événement mis à jour.');
      } else {
        // Participation non tarifée : aucun prix.
        const created = await EventService.create({
          ...patch,
          alumni_price_cents: 0,
          other_price_cents: 0,
        });
        await reload();
        setCreating(false);
        setEventId(created.id);
        setMessage('Événement créé. Il est maintenant sélectionné dans le tableau de bord.');
      }
    } catch (err) {
      setFormError(err instanceof AppError ? err.userMessage : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Événement</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vous modifiez l'événement choisi dans le bandeau ci-dessus. Seul
          l'événement « En cours (publié) » est affiché sur le site, ouvert aux
          inscriptions et accepté au scanner. Une fois un événement terminé,
          passez-le en « Archivé » : ses données restent consultables.
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

      {!loading && (
        <>
          {canWrite && !creating && (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Préparer un nouvel événement
            </Button>
          )}

          {!creating && event?.status === EventStatus.ARCHIVED && (
            <Alert tone="warning" title="Événement archivé">
              Cet événement est terminé. Ses inscrits et ses statistiques restent
              consultables, mais il n'est plus affiché sur le site.
            </Alert>
          )}

          {form.status === EventStatus.PUBLISHED && otherPublished.length > 0 && (
            <Alert tone="warning" title="Plusieurs événements publiés">
              « {otherPublished.map((e) => e.name).join(' », « ')} » est aussi
              publié. Le site affiche le plus ancien : archivez celui qui est
              terminé.
            </Alert>
          )}

          {events.length === 0 && !creating && (
            <Alert tone="info" title="Aucun événement">
              Préparez l'événement ci-dessous, puis publiez-le pour l'afficher
              sur le site.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{selectedId ? "Modifier l'événement" : 'Nouvel événement'}</CardTitle>
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

                <Field label="Lieu" hint="Vide = « lieu à confirmer ».">
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      value={form.location}
                      disabled={!canWrite}
                      onChange={(e) => set('location', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Heure de début" hint="Vide = « horaire à confirmer ».">
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      type="time"
                      aria-describedby={describedBy}
                      value={form.startTime}
                      disabled={!canWrite}
                      onChange={(e) => set('startTime', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Statut" hint="Seul « En cours (publié) » est visible du public.">
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={form.status}
                      disabled={!canWrite}
                      onChange={(e) => set('status', e.target.value as EventStatus)}
                    >
                      {Object.values(EventStatus).map((s) => (
                        <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>
                      ))}
                    </Select>
                  )}
                </Field>

                {canWrite && (
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" loading={busy}>
                      {selectedId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {selectedId ? 'Enregistrer' : "Créer l'événement"}
                    </Button>
                    {creating && (
                      <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                        Annuler
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
