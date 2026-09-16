import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { PaymentService } from '@/features/payments/PaymentService';
import { AppError } from '@/lib/errors';
import { formatMoney } from '@/lib/utils';
import {
  PAYMENT_STATUS_LABELS,
  PARTICIPANT_TYPE_LABELS,
  type PaymentStatus,
} from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/useToast';

function tone(s: PaymentStatus) {
  return s === 'AWAITING_CONFIRMATION' ? 'amber' : 'neutral';
}

export function PaymentsPage() {
  const { can } = useAuth();
  const canWrite = can('payments:write');
  const { data, loading, error, reload } = useAsync(
    () => PaymentService.listPending(),
    [],
  );
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, id: string, ok = "Action effectuée.") => {
    setBusyId(id);
    try {
      await fn();
      toast.success(ok);
      reload();
    } catch (e) {
      toast.error(e instanceof AppError ? e.userMessage : 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Paiements en attente</h1>
        <p className="mt-1 text-sm text-slate-600">
          Confirmez un paiement uniquement après vérification réelle. La
          déclaration de l'utilisateur ne vaut pas confirmation.
        </p>
      </header>

      {!canWrite && (
        <Alert tone="warning">
          Votre rôle permet la consultation mais pas la confirmation des paiements.
        </Alert>
      )}

      {loading && <LoadingState label="Chargement des paiements…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="Aucun paiement en attente"
          description="Les paiements à confirmer apparaîtront ici."
        />
      )}

      {!loading &&
        !error &&
        (data ?? []).map((pay) => (
          <Card key={pay.id}>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {pay.participant
                    ? `${pay.participant.first_name} ${pay.participant.last_name}`
                    : 'Participant'}
                  {pay.participant && (
                    <span className="ml-2 text-xs text-slate-400">
                      {PARTICIPANT_TYPE_LABELS[pay.participant.participant_type]}
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  Réf. <span className="font-mono">{pay.reference}</span> —{' '}
                  {formatMoney(pay.amount_cents, pay.currency)}
                </p>
                <div className="mt-1">
                  <Badge tone={tone(pay.status)}>
                    {PAYMENT_STATUS_LABELS[pay.status]}
                  </Badge>
                </div>
              </div>
              {canWrite && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    loading={busyId === pay.id}
                    onClick={() => run(() => PaymentService.confirm(pay.id, 'WERO'), pay.id, 'Paiement confirmé — le billet est émis.')}
                  >
                    Confirmer
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === pay.id}
                    onClick={() => run(() => PaymentService.reject(pay.id, 'Rejet manuel'), pay.id, 'Paiement rejeté — le participant en est informé.')}
                  >
                    Rejeter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
