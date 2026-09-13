import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { PortalService } from '@/features/portal/PortalService';
import { PaymentService } from '@/features/payments/PaymentService';
import { TicketService } from '@/features/tickets/TicketService';
import { TicketCard } from '@/features/tickets/TicketCard';
import { paymentConfig } from '@/config/event.config';
import {
  PAYMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  PaymentStatus,
  ParticipantType,
} from '@/types/enums';
import { AppError } from '@/lib/errors';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function readStoredToken(): string {
  try {
    return localStorage.getItem('portal_token') ?? '';
  } catch {
    return '';
  }
}

export function PortalPage() {
  const [params] = useSearchParams();
  const token = useMemo(
    () => params.get('t')?.trim() || readStoredToken(),
    [params],
  );

  const status = useAsync(
    () => (token ? PortalService.getStatus(token) : Promise.resolve(null)),
    [token],
  );
  const ticket = useAsync(
    () =>
      token && status.data?.ticket_number
        ? TicketService.getByToken(token)
        : Promise.resolve(null),
    [token, status.data?.ticket_number],
  );

  const [declaring, setDeclaring] = useState(false);
  const [declareError, setDeclareError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="container max-w-xl py-12">
        <Alert tone="warning" title="Lien manquant">
          Ce lien privé est nécessaire pour accéder à votre espace. Utilisez le
          lien qui vous a été communiqué lors de votre inscription.
        </Alert>
      </div>
    );
  }

  if (status.loading) {
    return (
      <div className="container max-w-xl py-12">
        <LoadingState label="Chargement de votre espace…" />
      </div>
    );
  }
  if (status.error) {
    return (
      <div className="container max-w-xl py-12">
        <ErrorState error={status.error} onRetry={status.reload} />
      </div>
    );
  }
  if (!status.data) {
    return (
      <div className="container max-w-xl py-12">
        <Alert tone="error" title="Lien invalide">
          Aucun dossier ne correspond à ce lien. Vérifiez que le lien est complet.
        </Alert>
      </div>
    );
  }

  const s = status.data;
  const paymentRequired = s.payment_required ?? s.participant_type !== ParticipantType.NEW_STUDENT;
  const canDeclare =
    paymentRequired &&
    (s.payment_status === PaymentStatus.PENDING ||
      s.payment_status === PaymentStatus.AWAITING_CONFIRMATION);

  const onDeclare = async () => {
    setDeclareError(null);
    setDeclaring(true);
    try {
      await PaymentService.submitDeclaration(token);
      status.reload();
    } catch (e) {
      setDeclareError(
        e instanceof AppError ? e.userMessage : 'Erreur, réessayez plus tard.',
      );
    } finally {
      setDeclaring(false);
    }
  };

  return (
    <div className="container max-w-xl space-y-6 py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Bonjour {s.first_name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">Suivi de votre inscription.</p>
      </header>

      {/* Ticket prêt */}
      {s.ticket_status === 'GENERATED' && ticket.data && (
        <section aria-label="Votre billet">
          <TicketCard ticket={ticket.data} token={token} />
        </section>
      )}

      {/* État de l'inscription */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-semibold text-slate-900">État</h2>

          {s.participant_type === ParticipantType.NEW_STUDENT && (
            <StatusRow
              label="Vérification"
              value={VERIFICATION_STATUS_LABELS[s.verification_status]}
              tone={
                s.verification_status === 'VERIFIED'
                  ? 'green'
                  : s.verification_status === 'REJECTED'
                    ? 'red'
                    : 'amber'
              }
            />
          )}
          {paymentRequired && (
            <StatusRow
              label="Paiement"
              value={PAYMENT_STATUS_LABELS[s.payment_status]}
              tone={
                s.payment_status === 'PAID'
                  ? 'green'
                  : s.payment_status === 'REJECTED' || s.payment_status === 'FAILED'
                    ? 'red'
                    : 'amber'
              }
            />
          )}
          <StatusRow
            label="Billet"
            value={s.ticket_status === 'GENERATED' ? 'Émis' : 'En attente'}
            tone={s.ticket_status === 'GENERATED' ? 'green' : 'neutral'}
          />

          {/* Message « pourquoi j'attends » */}
          {s.ticket_status !== 'GENERATED' && (
            <Alert tone="info">
              {s.participant_type === ParticipantType.NEW_STUDENT &&
              s.verification_status !== 'VERIFIED'
                ? "Votre statut de nouveau étudiant est en cours de vérification. Votre billet sera émis après validation."
                : paymentRequired && s.payment_status !== 'PAID'
                  ? "Votre billet sera émis après confirmation de votre paiement."
                  : "Votre billet sera disponible ici prochainement."}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions et déclaration de paiement (Wero V1) */}
      {canDeclare && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold text-slate-900">Paiement — {paymentConfig.provider}</h2>
            {paymentConfig.isPlaceholder && (
              <Alert tone="warning">
                Les coordonnées de paiement définitives seront confirmées.
              </Alert>
            )}
            <ul className="space-y-1 text-sm text-slate-700">
              <li>Bénéficiaire : <strong>{paymentConfig.beneficiary}</strong></li>
              <li>Contact / numéro : <strong>{paymentConfig.phoneOrHandle}</strong></li>
              {s.payment_reference && (
                <li>
                  Référence à indiquer :{' '}
                  <strong className="font-mono">{s.payment_reference}</strong>
                </li>
              )}
            </ul>
            <p className="text-sm text-slate-600">{paymentConfig.instructions}</p>

            {s.payment_status === PaymentStatus.AWAITING_CONFIRMATION ? (
              <Alert tone="info" title="En attente de confirmation">
                Vous avez déclaré votre paiement. Un administrateur va le vérifier.
                Cette déclaration ne vaut pas confirmation.
              </Alert>
            ) : (
              <>
                <Button onClick={onDeclare} loading={declaring}>
                  J'ai effectué le paiement
                </Button>
                <p className="text-xs text-slate-400">
                  Ce bouton signale seulement votre paiement pour vérification ;
                  il ne le confirme pas automatiquement.
                </p>
              </>
            )}
            {declareError && <Alert tone="error">{declareError}</Alert>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'amber' | 'red' | 'neutral' | 'brand';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
