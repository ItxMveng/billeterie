import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, CheckCircle2, Ban } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { PortalService, type ParticipantStatusView } from '@/features/portal/PortalService';
import { PaymentService } from '@/features/payments/PaymentService';
import { TicketService } from '@/features/tickets/TicketService';
import { TicketCard } from '@/features/tickets/TicketCard';
import { paymentConfig, associationConfig } from '@/config/event.config';
import { ParticipantType, PaymentStatus } from '@/types/enums';
import { AppError } from '@/lib/errors';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';

function readStoredToken(): string {
  try {
    return localStorage.getItem('portal_token') ?? '';
  } catch {
    return '';
  }
}

/** Contact d'aide, affiché sur tous les cas bloquants. */
function HelpLine() {
  return (
    <p className="mt-2 text-sm">
      Une question ?{' '}
      <a
        href={`mailto:${associationConfig.contactEmail}`}
        className="font-medium underline underline-offset-2"
      >
        {associationConfig.contactEmail}
      </a>
    </p>
  );
}

/**
 * Situation globale du participant, dérivée de ses statuts.
 * Chaque état terminal ou bloquant a son propre message : aucun cas ne doit
 * afficher un vague « en attente ».
 */
type Situation =
  | 'REGISTRATION_REJECTED'
  | 'TICKET_CANCELLED'
  | 'VERIFICATION_REJECTED'
  | 'PAYMENT_REJECTED'
  | 'TICKET_READY'
  | 'AWAITING_VERIFICATION'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_PAYMENT_CONFIRMATION'
  | 'AWAITING_TICKET';

function computeSituation(s: ParticipantStatusView, paymentRequired: boolean): Situation {
  if (s.registration_status === 'REJECTED') return 'REGISTRATION_REJECTED';
  if (s.ticket_status === 'CANCELLED') return 'TICKET_CANCELLED';
  if (s.verification_status === 'REJECTED') return 'VERIFICATION_REJECTED';
  if (s.payment_status === 'REJECTED' || s.payment_status === 'FAILED') return 'PAYMENT_REJECTED';
  if (s.ticket_status === 'GENERATED') return 'TICKET_READY';
  if (s.participant_type === ParticipantType.NEW_STUDENT && s.verification_status !== 'VERIFIED') {
    return 'AWAITING_VERIFICATION';
  }
  if (paymentRequired && s.payment_status === PaymentStatus.AWAITING_CONFIRMATION) {
    return 'AWAITING_PAYMENT_CONFIRMATION';
  }
  if (paymentRequired && s.payment_status !== 'PAID') return 'AWAITING_PAYMENT';
  return 'AWAITING_TICKET';
}

export function PortalPage() {
  const [params] = useSearchParams();
  const toast = useToast();
  const token = useMemo(() => params.get('t')?.trim() || readStoredToken(), [params]);

  const status = useAsync(
    () => (token ? PortalService.getStatus(token) : Promise.resolve(null)),
    [token],
  );
  const ticket = useAsync(
    () =>
      token && status.data?.ticket_status === 'GENERATED'
        ? TicketService.getByToken(token)
        : Promise.resolve(null),
    [token, status.data?.ticket_status],
  );

  const [declaring, setDeclaring] = useState(false);

  if (!token) {
    return (
      <div className="container max-w-xl py-16">
        <Alert tone="warning" title="Lien manquant">
          Ce lien privé est nécessaire pour accéder à votre espace. Utilisez le
          lien qui vous a été communiqué lors de votre inscription.
          <HelpLine />
        </Alert>
      </div>
    );
  }

  if (status.loading) {
    return (
      <div className="container max-w-xl py-16">
        <LoadingState label="Chargement de votre espace…" />
      </div>
    );
  }
  if (status.error) {
    return (
      <div className="container max-w-xl py-16">
        <ErrorState error={status.error} onRetry={status.reload} />
      </div>
    );
  }
  if (!status.data) {
    return (
      <div className="container max-w-xl py-16">
        <Alert tone="error" title="Lien invalide">
          Aucun dossier ne correspond à ce lien. Vérifiez qu'il est complet
          (il est long et se termine par une suite de caractères).
          <HelpLine />
        </Alert>
      </div>
    );
  }

  const s = status.data;
  const paymentRequired =
    s.payment_required ?? s.participant_type !== ParticipantType.NEW_STUDENT;
  const situation = computeSituation(s, paymentRequired);

  const canDeclare =
    situation === 'AWAITING_PAYMENT' || situation === 'AWAITING_PAYMENT_CONFIRMATION';

  const onDeclare = async () => {
    setDeclaring(true);
    try {
      await PaymentService.submitDeclaration(token);
      toast.success(
        'Un administrateur va vérifier votre paiement.',
        'Déclaration enregistrée',
      );
      status.reload();
    } catch (e) {
      toast.error(
        e instanceof AppError ? e.userMessage : 'Erreur, réessayez plus tard.',
      );
    } finally {
      setDeclaring(false);
    }
  };

  return (
    <div className="container max-w-xl space-y-6 py-12">
      <header>
        <h1 className="font-display text-3xl font-bold text-navy-900">
          Bonjour {s.first_name}
        </h1>
        <p className="mt-1 text-navy-600">Suivi de votre inscription.</p>
      </header>

      {/* ── Cas bloquants : message explicite, jamais « en attente » ───────── */}
      {situation === 'TICKET_CANCELLED' && (
        <Alert tone="error" title="Votre billet a été annulé">
          <p>
            Ce billet n'est plus valable et ne permettra pas l'entrée à
            l'événement. Si vous pensez qu'il s'agit d'une erreur, contactez
            l'association — elle pourra le rétablir.
          </p>
          <HelpLine />
        </Alert>
      )}

      {situation === 'REGISTRATION_REJECTED' && (
        <Alert tone="error" title="Inscription refusée">
          <p>Votre inscription n'a pas été retenue.</p>
          <HelpLine />
        </Alert>
      )}

      {situation === 'VERIFICATION_REJECTED' && (
        <Alert tone="error" title="Statut non confirmé">
          <p>
            Votre statut de nouveau étudiant n'a pas pu être confirmé. Si vous
            êtes bien nouvel étudiant, contactez l'association. Vous pouvez
            également participer en tant qu'invité.
          </p>
          <HelpLine />
        </Alert>
      )}

      {situation === 'PAYMENT_REJECTED' && (
        <Alert tone="error" title="Paiement non validé">
          <p>
            Votre paiement n'a pas pu être confirmé. Contactez l'association
            pour régulariser votre situation.
          </p>
          <HelpLine />
        </Alert>
      )}

      {/* ── Billet prêt ────────────────────────────────────────────────────── */}
      {situation === 'TICKET_READY' && (
        <>
          {ticket.loading && <LoadingState label="Chargement de votre billet…" />}
          {ticket.data && (
            <section aria-label="Votre billet">
              <TicketCard ticket={ticket.data} token={token} />
            </section>
          )}
        </>
      )}

      {/* ── Étapes en cours ────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display font-semibold text-navy-900">
            Où en êtes-vous ?
          </h2>

          <Step
            done={
              s.participant_type !== ParticipantType.NEW_STUDENT ||
              s.verification_status === 'VERIFIED'
            }
            failed={s.verification_status === 'REJECTED'}
            label="Vérification du statut"
            detail={
              s.participant_type !== ParticipantType.NEW_STUDENT
                ? 'Non requise pour votre catégorie'
                : s.verification_status === 'VERIFIED'
                  ? 'Statut confirmé'
                  : s.verification_status === 'REJECTED'
                    ? 'Non confirmé'
                    : 'En cours de vérification par l\'association'
            }
          />

          <Step
            done={!paymentRequired || s.payment_status === 'PAID'}
            failed={s.payment_status === 'REJECTED' || s.payment_status === 'FAILED'}
            label="Paiement"
            detail={
              !paymentRequired
                ? 'Participation gratuite'
                : s.payment_status === 'PAID'
                  ? 'Paiement confirmé'
                  : s.payment_status === PaymentStatus.AWAITING_CONFIRMATION
                    ? 'Déclaré — en attente de confirmation'
                    : s.payment_status === 'REJECTED' || s.payment_status === 'FAILED'
                      ? 'Non validé'
                      : 'À effectuer'
            }
          />

          <Step
            done={s.ticket_status === 'GENERATED'}
            failed={s.ticket_status === 'CANCELLED'}
            label="Billet"
            detail={
              s.ticket_status === 'GENERATED'
                ? `Émis${s.ticket_number ? ` — ${s.ticket_number}` : ''}`
                : s.ticket_status === 'CANCELLED'
                  ? 'Annulé'
                  : 'Émis automatiquement une fois les étapes ci-dessus validées'
            }
          />

          {/* Explication de l'attente, uniquement si l'on attend vraiment */}
          {situation === 'AWAITING_VERIFICATION' && (
            <Alert tone="info">
              Votre statut de nouveau étudiant est en cours de vérification.
              Votre billet sera émis automatiquement dès validation — vous
              n'avez rien à payer.
            </Alert>
          )}
          {situation === 'AWAITING_PAYMENT_CONFIRMATION' && (
            <Alert tone="info" title="Paiement déclaré">
              Un administrateur va vérifier votre paiement. Cette déclaration ne
              vaut pas confirmation ; votre billet suivra une fois validé.
            </Alert>
          )}
          {situation === 'AWAITING_TICKET' && (
            <Alert tone="info">
              Toutes vos étapes sont validées. Votre billet sera disponible ici
              très prochainement.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ── Paiement Wero ──────────────────────────────────────────────────── */}
      {canDeclare && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display font-semibold text-navy-900">
              Paiement — {paymentConfig.provider}
            </h2>
            {paymentConfig.isPlaceholder && (
              <Alert tone="warning">
                Les coordonnées de paiement définitives seront communiquées
                prochainement.
              </Alert>
            )}
            <ul className="space-y-1 text-sm text-navy-700">
              <li>Bénéficiaire : <strong>{paymentConfig.beneficiary}</strong></li>
              <li>Contact / numéro : <strong>{paymentConfig.phoneOrHandle}</strong></li>
              {s.payment_reference && (
                <li>
                  Référence à indiquer :{' '}
                  <strong className="font-mono">{s.payment_reference}</strong>
                </li>
              )}
            </ul>
            <p className="text-sm text-navy-600">{paymentConfig.instructions}</p>

            {situation === 'AWAITING_PAYMENT' && (
              <>
                <Button onClick={() => void onDeclare()} loading={declaring}>
                  J'ai effectué le paiement
                </Button>
                <p className="text-xs text-navy-400">
                  Ce bouton signale votre paiement pour vérification ; il ne le
                  confirme pas automatiquement.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Step({
  done,
  failed,
  label,
  detail,
}: {
  done: boolean;
  failed?: boolean;
  label: string;
  detail: string;
}) {
  const Icon = failed ? Ban : done ? CheckCircle2 : Clock;
  const color = failed
    ? 'text-red-600'
    : done
      ? 'text-green-600'
      : 'text-amber-600';
  return (
    <div className="flex items-start gap-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-navy-900">{label}</p>
        <p className="text-sm text-navy-600">{detail}</p>
      </div>
    </div>
  );
}
