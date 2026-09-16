import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { TicketService } from '@/features/tickets/TicketService';
import { canGenerateTicket } from '@/features/participants/participant.logic';
import { AppError } from '@/lib/errors';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/useToast';

export function TicketsPage() {
  const { can } = useAuth();
  const canWrite = can('tickets:write');
  const { data, loading, error, reload } = useAsync(() => ParticipantService.list(), []);
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
        <h1 className="text-2xl font-bold text-slate-900">Billets</h1>
        <p className="mt-1 text-sm text-slate-600">
          Génération réservée aux participants éligibles (vérifiés ou payés). La
          génération est idempotente : un participant ne peut avoir qu'un billet.
        </p>
      </header>

      {!canWrite && (
        <Alert tone="warning">Consultation seule : génération non autorisée pour votre rôle.</Alert>
      )}

      {loading && <LoadingState label="Chargement…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState title="Aucun participant" />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Participant</th>
                <th scope="col" className="px-4 py-3">Catégorie</th>
                <th scope="col" className="px-4 py-3">Billet</th>
                <th scope="col" className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((p) => {
                const eligible = canGenerateTicket(p);
                const generated = p.ticket_status === 'GENERATED';
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-xs text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {PARTICIPANT_TYPE_LABELS[p.participant_type]}
                    </td>
                    <td className="px-4 py-3">
                      {generated ? (
                        <Badge tone="green">Émis</Badge>
                      ) : eligible ? (
                        <Badge tone="amber">Éligible</Badge>
                      ) : (
                        <Badge tone="neutral">Non éligible</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && !generated && eligible && (
                        <Button
                          size="sm"
                          loading={busyId === p.id}
                          onClick={() => run(() => TicketService.generate(p.id), p.id, 'Billet généré.')}
                        >
                          Générer
                        </Button>
                      )}
                      {canWrite && generated && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === p.id}
                          onClick={() =>
                            run(() => TicketService.cancel(p.id, 'Annulation manuelle'), p.id, 'Billet annulé — le participant en est informé.')
                          }
                        >
                          Annuler
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
