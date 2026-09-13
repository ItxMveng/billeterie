import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

export function ParticipantDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => ParticipantService.getDetail(id),
    [id],
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError(e instanceof AppError ? e.userMessage : 'Action impossible.');
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

          {actionError && <Alert tone="error">{actionError}</Alert>}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
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

                {can('tickets:write') && !data.ticket && canGenerateTicket(data.participant) && (
                  <Button size="sm" disabled={busy} onClick={() => run(() => TicketService.generate(id))}>
                    Générer le ticket
                  </Button>
                )}
                {can('tickets:write') && data.ticket?.status === 'GENERATED' && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => TicketService.cancel(id, 'Annulation manuelle'))}>
                    Annuler le ticket
                  </Button>
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
