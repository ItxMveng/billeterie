import { useMemo, useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { VerificationService } from '@/features/verification/VerificationService';
import {
  matchVerificationRecord,
  type VerificationRecordLike,
} from '@/features/verification/verification.logic';
import { AppError } from '@/lib/errors';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { ParticipantRow } from '@/types/database';

const OUTCOME_TONE = { MATCH: 'green', AMBIGUOUS: 'amber', NO_MATCH: 'red' } as const;
const OUTCOME_LABEL = {
  MATCH: 'Correspondance',
  AMBIGUOUS: 'Ambiguë',
  NO_MATCH: 'Aucune',
} as const;

export function VerificationPage() {
  const { can } = useAuth();
  const canWrite = can('participants:write');

  const pending = useAsync(() => ParticipantService.listPendingVerification(), []);
  const records = useAsync(() => VerificationService.listRecords(), []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const recordList: VerificationRecordLike[] = useMemo(
    () =>
      (records.data ?? []).map((r) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        school_id: r.school_id,
        external_identifier: r.external_identifier,
        status: r.status,
      })),
    [records.data],
  );

  const runAction = async (fn: () => Promise<unknown>, id: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      await fn();
      pending.reload();
    } catch (e) {
      setActionError(e instanceof AppError ? e.userMessage : 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const loading = pending.loading || records.loading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Vérification des nouveaux étudiants
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Un statut déclaré n'est jamais une preuve. Validez chaque nouveau
          étudiant à l'aide de la liste officielle.
        </p>
      </header>

      {!canWrite && (
        <Alert tone="warning">
          Votre rôle permet la consultation mais pas la vérification.
        </Alert>
      )}
      {actionError && <Alert tone="error">{actionError}</Alert>}

      {loading && <LoadingState label="Chargement…" />}
      {!loading && pending.error && (
        <ErrorState error={pending.error} onRetry={pending.reload} />
      )}
      {!loading && !pending.error && (pending.data?.length ?? 0) === 0 && (
        <EmptyState
          title="Aucun étudiant en attente"
          description="Les nouveaux étudiants à vérifier apparaîtront ici."
        />
      )}

      {!loading &&
        !pending.error &&
        (pending.data?.length ?? 0) > 0 &&
        (pending.data as ParticipantRow[]).map((p) => {
          const match = matchVerificationRecord(
            {
              first_name: p.first_name,
              last_name: p.last_name,
              email: p.email,
              school_id: p.school_id,
            },
            recordList,
          );
          const matchedRecord =
            match.recordId && records.data
              ? records.data.find((r) => r.id === match.recordId)
              : null;

          return (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="truncate text-sm text-slate-500">{p.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Matching :</span>
                    <Badge tone={OUTCOME_TONE[match.outcome]}>
                      {OUTCOME_LABEL[match.outcome]}
                    </Badge>
                    {matchedRecord && (
                      <span className="text-xs text-slate-500">
                        → {matchedRecord.first_name} {matchedRecord.last_name}
                        {matchedRecord.email ? ` (${matchedRecord.email})` : ''}
                      </span>
                    )}
                    {match.outcome === 'AMBIGUOUS' && (
                      <span className="text-xs text-amber-600">
                        {match.candidateIds.length} candidat(s) — vérification manuelle
                      </span>
                    )}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      loading={busyId === p.id}
                      onClick={() => runAction(() => VerificationService.verify(p.id), p.id)}
                    >
                      Vérifier
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === p.id}
                      onClick={() =>
                        runAction(
                          () => VerificationService.reject(p.id, 'Rejet manuel'),
                          p.id,
                        )
                      }
                    >
                      Rejeter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
