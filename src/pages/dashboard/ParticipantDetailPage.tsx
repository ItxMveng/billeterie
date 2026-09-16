import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, X, Trash2 } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { VerificationService } from '@/features/verification/VerificationService';
import { PaymentService } from '@/features/payments/PaymentService';
import { TicketService } from '@/features/tickets/TicketService';
import { canGenerateTicket } from '@/features/participants/participant.logic';
import { AppError } from '@/lib/errors';
import { formatMoney, formatDate } from '@/lib/utils';
import {
  PARTICIPANT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  PaymentStatus,
} from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useToast } from '@/components/ui/useToast';
import { SchoolService } from '@/features/schools/SchoolService';

export function ParticipantDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => ParticipantService.getDetail(id),
    [id],
  );
  const toast = useToast();
  const navigate = useNavigate();
  const schools = useAsync(() => SchoolService.listAll(), []);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", school_id: "", external_identifier: "" });

  const run = async (fn: () => Promise<unknown>, okMessage = "Action effectuée.") => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMessage);
      reload();
    } catch (e) {
      toast.error(e instanceof AppError ? e.userMessage : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/dashboard/participants" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour aux participants
      </Link>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && data && (
        <>
          <header>
            <h1 className="text-2xl font-bold text-slate-900">
              {data.participant.first_name} {data.participant.last_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {data.participant.email} — {data.participant.phone}
            </p>
          </header>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Profil</CardTitle>
                {can('participants:write') && !editing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const p = data.participant;
                      setForm({
                        first_name: p.first_name,
                        last_name: p.last_name,
                        email: p.email,
                        phone: p.phone,
                        school_id: p.school_id ?? '',
                        external_identifier: p.external_identifier ?? '',
                      });
                      setEditing(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Modifier
                  </Button>
                )}
              </CardHeader>

              {editing ? (
                <CardContent>
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(
                        () =>
                          ParticipantService.update(id, {
                            first_name: form.first_name,
                            last_name: form.last_name,
                            email: form.email,
                            phone: form.phone,
                            school_id: form.school_id || null,
                            external_identifier: form.external_identifier || null,
                          }),
                        'Coordonnées mises à jour.',
                      ).then(() => setEditing(false));
                    }}
                  >
                    <Field label="Prénom" required>
                      {({ id: fid }) => (
                        <Input id={fid} value={form.first_name}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                      )}
                    </Field>
                    <Field label="Nom" required>
                      {({ id: fid }) => (
                        <Input id={fid} value={form.last_name}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                      )}
                    </Field>
                    <Field label="Email" required>
                      {({ id: fid }) => (
                        <Input id={fid} type="email" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      )}
                    </Field>
                    <Field label="Téléphone">
                      {({ id: fid }) => (
                        <Input id={fid} type="tel" value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      )}
                    </Field>
                    <Field
                      label="École"
                      hint={data.participant.participant_type === 'ALUMNI' ? 'Obligatoire pour un ancien étudiant' : undefined}
                    >
                      {({ id: fid, describedBy }) => (
                        <Select id={fid} aria-describedby={describedBy} value={form.school_id}
                          onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
                          <option value="">— Aucune —</option>
                          {(schools.data ?? []).map((sc) => (
                            <option key={sc.id} value={sc.id}>{sc.name}</option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label="Numéro étudiant">
                      {({ id: fid }) => (
                        <Input id={fid} value={form.external_identifier}
                          onChange={(e) => setForm({ ...form, external_identifier: e.target.value })} />
                      )}
                    </Field>
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" size="sm" loading={busy}>
                        <Save className="h-4 w-4" aria-hidden="true" /> Enregistrer
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4" aria-hidden="true" /> Annuler
                      </Button>
                    </div>
                  </form>
                </CardContent>
              ) : (
              <CardContent className="space-y-2 text-sm">
                <Row label="Catégorie" value={PARTICIPANT_TYPE_LABELS[data.participant.participant_type]} />
                <Row label="Inscription" value={REGISTRATION_STATUS_LABELS[data.participant.registration_status]} />
                <Row label="Vérification" value={VERIFICATION_STATUS_LABELS[data.participant.verification_status]} />
                <Row label="Paiement requis" value={
                  (data.participant.payment_required ?? data.participant.participant_type !== 'NEW_STUDENT') ? 'Oui' : 'Non (exempté)'
                } />
                <Row label="Statut paiement" value={PAYMENT_STATUS_LABELS[data.participant.payment_status]} />
                <Row label="Billet" value={
                  data.ticket ? `${data.ticket.ticket_number} (${data.ticket.status})` : 'Aucun'
                } />
                <Row label="Entrée" value={data.participant.checked_in
                  ? `Oui — ${data.participant.checked_in_at ? new Date(data.participant.checked_in_at).toLocaleString('fr-FR') : ''}`
                  : 'Non'} />
              </CardContent>
              )}
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {can('participants:write') && data.participant.participant_type === 'NEW_STUDENT' &&
                  data.participant.verification_status !== 'VERIFIED' && (
                    <>
                      <Button size="sm" loading={busy} onClick={() => run(() => VerificationService.verify(id))}>
                        Vérifier
                      </Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => run(() => VerificationService.reject(id, 'Rejet manuel'))}>
                        Rejeter vérif.
                      </Button>
                    </>
                  )}

                {can('payments:write') && data.payments.some((p) =>
                  p.status === PaymentStatus.PENDING || p.status === PaymentStatus.AWAITING_CONFIRMATION) && (
                  <>
                    <Button size="sm" loading={busy} onClick={() => {
                      const active = data.payments.find((p) => p.status === 'PENDING' || p.status === 'AWAITING_CONFIRMATION');
                      if (active) void run(() => PaymentService.confirm(active.id, 'WERO'));
                    }}>
                      Confirmer paiement
                    </Button>
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => {
                      const active = data.payments.find((p) => p.status === 'PENDING' || p.status === 'AWAITING_CONFIRMATION');
                      if (active) void run(() => PaymentService.reject(active.id, 'Rejet manuel'));
                    }}>
                      Rejeter paiement
                    </Button>
                  </>
                )}

                {can('participants:write') &&
                  (data.participant.payment_required ?? true) &&
                  data.participant.payment_status !== 'PAID' && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => PaymentService.waive(id, 'Exemption'))}>
                      Exempter de paiement
                    </Button>
                  )}

                {/* Couvre aussi la RÉÉMISSION d'un billet annulé. */}
                {can('tickets:write') &&
                  data.ticket?.status !== 'GENERATED' &&
                  canGenerateTicket(data.participant) && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => TicketService.generate(id),
                          data.ticket?.status === 'CANCELLED'
                            ? 'Billet rétabli.'
                            : 'Billet généré.',
                        )
                      }
                    >
                      {data.ticket?.status === 'CANCELLED'
                        ? 'Rétablir le billet'
                        : 'Générer le billet'}
                    </Button>
                  )}
                {can('tickets:write') && data.ticket?.status === 'GENERATED' && (
                  <ConfirmButton
                    confirmLabel="Annuler le billet"
                    loading={busy}
                    onConfirm={() =>
                      void run(
                        () => TicketService.cancel(id, 'Annulation manuelle'),
                        'Billet annulé. Le participant en est informé dans son espace.',
                      )
                    }
                  >
                    Annuler le billet
                  </ConfirmButton>
                )}

                {!can('participants:write') && !can('payments:write') && !can('tickets:write') && (
                  <p className="text-sm text-slate-500">Aucune action disponible pour votre rôle.</p>
                )}
              </CardContent>
            </Card>

            {/* Paiements (finance/admin/viewer) */}
            {can('payments:read') && (
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Paiements</CardTitle></CardHeader>
                <CardContent>
                  {data.payments.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun paiement.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {data.payments.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="font-mono">{p.reference}</span>
                          <span>{formatMoney(p.amount_cents, p.currency)}</span>
                          <Badge tone={p.status === 'PAID' ? 'green' : p.status === 'REJECTED' ? 'red' : 'amber'}>
                            {PAYMENT_STATUS_LABELS[p.status]}
                          </Badge>
                          <span className="text-xs text-slate-400">{p.provider}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Historique check-in */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Historique d'entrée</CardTitle></CardHeader>
              <CardContent>
                {data.checkins.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun passage enregistré.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.checkins.map((c) => (
                      <li key={c.id}>
                        {new Date(c.checked_in_at).toLocaleString('fr-FR')} — {c.method}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {can('admins:manage') && (
            <Card className="border-red-200">
              <CardHeader><CardTitle>Zone sensible</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Alert tone="warning">
                  La suppression est <strong>définitive</strong> : billet, paiements
                  et historique d'entrée sont effacés. Préférez l'annulation du
                  billet si la personne ne vient simplement pas.
                </Alert>
                <ConfirmButton
                  confirmLabel="Supprimer définitivement"
                  loading={busy}
                  onConfirm={() =>
                    void run(
                      () => ParticipantService.remove(id),
                      'Participant supprimé.',
                    ).then(() => navigate('/dashboard/participants'))
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Supprimer ce participant
                </ConfirmButton>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-400">Inscrit le {formatDate(data.participant.created_at)}.</p>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
