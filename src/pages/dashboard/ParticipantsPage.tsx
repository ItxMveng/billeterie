import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Trash2, Pencil, X } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import {
  ParticipantService,
  type ParticipantFilters,
} from '@/features/participants/ParticipantService';
import { SchoolService } from '@/features/schools/SchoolService';
import { ImportService } from '@/features/imports/ImportService';
import { AppError } from '@/lib/errors';
import {
  PARTICIPANT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  ParticipantType,
  PaymentStatus,
  VerificationStatus,
  type PaymentStatus as PaymentStatusT,
  type VerificationStatus as VerificationStatusT,
} from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useToast } from '@/components/ui/useToast';

function payTone(s: PaymentStatusT) {
  return s === 'PAID' ? 'green' : s === 'REJECTED' || s === 'FAILED' ? 'red' : s === 'NOT_REQUIRED' ? 'neutral' : 'amber';
}
function verifTone(s: VerificationStatusT) {
  return s === 'VERIFIED' ? 'green' : s === 'REJECTED' ? 'red' : s === 'PENDING' ? 'amber' : 'neutral';
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  participant_type: ParticipantType.NEW_STUDENT as ParticipantType,
  school_id: '',
  already_paid: false,
};

export function ParticipantsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can('participants:write');
  const canDelete = can('admins:manage');

  const [filters, setFilters] = useState<ParticipantFilters>({});
  const [qInput, setQInput] = useState('');

  const { data, loading, error, reload } = useAsync(
    () => ParticipantService.search(filters),
    [JSON.stringify(filters)],
  );
  const schools = useAsync(() => SchoolService.listAll(), []);

  // Création manuelle (inscription au guichet, ajout de dernière minute…)
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const applyQ = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: qInput.trim() || undefined }));
  };

  const setFilter = <K extends keyof ParticipantFilters>(key: K, value: ParticipantFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) return;
    if (form.participant_type === ParticipantType.ALUMNI && !form.school_id) {
      toast.error("L'école est obligatoire pour un ancien étudiant.");
      return;
    }
    setCreating(true);
    setCreatedLink(null);
    try {
      // Réutilise la RPC d'import (dédup, statuts dérivés et audit côté serveur).
      const res = await ImportService.importParticipants(
        [
          {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            participant_type: form.participant_type,
            school_id: form.school_id || null,
            already_paid: form.already_paid,
          },
        ],
        'ajout-manuel',
      );

      if (res.inserted === 1) {
        const token = res.tokens?.[0]?.access_token;
        toast.success(`${form.first_name} ${form.last_name} ajouté(e).`);
        if (token) {
          setCreatedLink(`${window.location.origin}/mon-billet?t=${token}`);
        }
        setForm(EMPTY_FORM);
        reload();
      } else {
        const issue = res.issues?.[0] as Record<string, unknown> | undefined;
        toast.error(
          String(issue?.skipped ?? issue?.error ?? 'Participant non ajouté.'),
          'Ajout refusé',
        );
      }
    } catch (err) {
      toast.error(err instanceof AppError ? err.userMessage : 'Ajout impossible.');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: string, label: string) => {
    setBusyId(id);
    try {
      await ParticipantService.remove(id);
      toast.success(`${label} supprimé(e).`);
      reload();
    } catch (err) {
      toast.error(err instanceof AppError ? err.userMessage : 'Suppression impossible.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Participants</h1>
          <p className="mt-1 text-sm text-slate-600">
            Recherche par nom, email, téléphone ou référence de paiement.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {showCreate ? 'Fermer' : 'Ajouter un participant'}
          </Button>
        )}
      </header>

      {/* ── Création manuelle ─────────────────────────────────────────────── */}
      {showCreate && canWrite && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-slate-900">Nouveau participant</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pour une inscription prise sur place. Les statuts sont calculés
              automatiquement selon la catégorie.
            </p>

            <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Prénom" required>
                {({ id }) => (
                  <Input id={id} value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                )}
              </Field>
              <Field label="Nom" required>
                {({ id }) => (
                  <Input id={id} value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                )}
              </Field>
              <Field label="Email" required>
                {({ id }) => (
                  <Input id={id} type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                )}
              </Field>
              <Field label="Téléphone">
                {({ id }) => (
                  <Input id={id} type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                )}
              </Field>
              <Field label="Catégorie" required>
                {({ id }) => (
                  <Select id={id} value={form.participant_type}
                    onChange={(e) => setForm({ ...form, participant_type: e.target.value as ParticipantType })}>
                    {Object.values(ParticipantType).map((t) => (
                      <option key={t} value={t}>{PARTICIPANT_TYPE_LABELS[t]}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="École"
                hint={form.participant_type === ParticipantType.ALUMNI ? 'Obligatoire' : 'Facultative'}
              >
                {({ id, describedBy }) => (
                  <Select id={id} aria-describedby={describedBy} value={form.school_id}
                    onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
                    <option value="">— Aucune —</option>
                    {(schools.data ?? []).filter((s) => s.is_active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                )}
              </Field>

              {form.participant_type !== ParticipantType.NEW_STUDENT && (
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={form.already_paid}
                    onChange={(e) => setForm({ ...form, already_paid: e.target.checked })}
                  />
                  A déjà payé (ne sera pas invité à payer)
                </label>
              )}

              <div className="sm:col-span-2">
                <Button type="submit" loading={creating}>
                  <UserPlus className="h-4 w-4" /> Ajouter
                </Button>
              </div>
            </form>

            {createdLink && (
              <Alert tone="success" title="Lien privé à communiquer" className="mt-4">
                <p>
                  Ce lien n'est affiché <strong>qu'une seule fois</strong> : copiez-le
                  et transmettez-le à la personne.
                </p>
                <div className="mt-2 break-all rounded bg-white/70 p-2 font-mono text-xs">
                  {createdLink}
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Recherche et filtres ──────────────────────────────────────────── */}
      <form onSubmit={applyQ} className="flex flex-wrap gap-2">
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Rechercher…"
          className="max-w-xs"
          aria-label="Recherche"
        />
        <Button type="submit">Rechercher</Button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          aria-label="Catégorie"
          value={filters.participant_type ?? ''}
          onChange={(e) => setFilter('participant_type', (e.target.value || undefined) as ParticipantType)}
        >
          <option value="">Toutes catégories</option>
          {Object.values(ParticipantType).map((t) => (
            <option key={t} value={t}>{PARTICIPANT_TYPE_LABELS[t]}</option>
          ))}
        </Select>
        <Select
          aria-label="Vérification"
          value={filters.verification_status ?? ''}
          onChange={(e) => setFilter('verification_status', (e.target.value || undefined) as VerificationStatus)}
        >
          <option value="">Toute vérification</option>
          {Object.values(VerificationStatus).map((s) => (
            <option key={s} value={s}>{VERIFICATION_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select
          aria-label="Paiement"
          value={filters.payment_status ?? ''}
          onChange={(e) => setFilter('payment_status', (e.target.value || undefined) as PaymentStatus)}
        >
          <option value="">Tout paiement</option>
          {Object.values(PaymentStatus).map((s) => (
            <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select
          aria-label="Check-in"
          value={filters.checked_in === undefined ? '' : filters.checked_in ? 'yes' : 'no'}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              checked_in: e.target.value === '' ? undefined : e.target.value === 'yes',
            }))
          }
        >
          <option value="">Entrée : tous</option>
          <option value="yes">Entrés</option>
          <option value="no">Non entrés</option>
        </Select>
      </div>

      {loading && <LoadingState label="Chargement…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState title="Aucun résultat" description="Ajustez votre recherche ou vos filtres." />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Nom</th>
                <th scope="col" className="px-4 py-3">Catégorie</th>
                <th scope="col" className="px-4 py-3">Vérif.</th>
                <th scope="col" className="px-4 py-3">Paiement</th>
                <th scope="col" className="px-4 py-3">Billet</th>
                <th scope="col" className="px-4 py-3">Entrée</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/participants/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.first_name} {p.last_name}
                    </Link>
                    <div className="text-xs text-slate-400">{p.email}</div>
                  </td>
                  <td className="px-4 py-3">{PARTICIPANT_TYPE_LABELS[p.participant_type]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={verifTone(p.verification_status)}>
                      {VERIFICATION_STATUS_LABELS[p.verification_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={payTone(p.payment_status)}>
                      {PAYMENT_STATUS_LABELS[p.payment_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.ticket_status === 'GENERATED' ? 'green' : p.ticket_status === 'CANCELLED' ? 'red' : 'neutral'}>
                      {p.ticket_status === 'GENERATED' ? 'Émis' : p.ticket_status === 'CANCELLED' ? 'Annulé' : '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.checked_in ? 'green' : 'neutral'}>
                      {p.checked_in ? 'Entré' : 'Non'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/dashboard/participants/${p.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Gérer
                      </Link>
                      {canDelete && (
                        <ConfirmButton
                          confirmLabel="Supprimer"
                          loading={busyId === p.id}
                          onConfirm={() => void onDelete(p.id, `${p.first_name} ${p.last_name}`)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">Supprimer {p.first_name} {p.last_name}</span>
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!canDelete && canWrite && (
        <p className="text-xs text-slate-500">
          La suppression définitive est réservée au super-administrateur. Vous
          pouvez modifier une fiche ou annuler un billet depuis « Gérer ».
        </p>
      )}
    </div>
  );
}
