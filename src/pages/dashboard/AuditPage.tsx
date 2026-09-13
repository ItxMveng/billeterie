import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { AuditService } from '@/features/audit/AuditService';
import { AuditAction } from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ForbiddenState } from '@/components/common/ForbiddenState';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

const ACTION_LABELS: Record<string, string> = {
  VERIFY_STUDENT: 'Vérification étudiant',
  REJECT_STUDENT: 'Rejet étudiant',
  CONFIRM_PAYMENT: 'Confirmation paiement',
  REJECT_PAYMENT: 'Rejet paiement',
  WAIVE_PAYMENT: 'Exemption paiement',
  IMPORT_PARTICIPANTS: 'Import participants',
  IMPORT_VERIFICATION_RECORDS: 'Import liste vérification',
  GENERATE_TICKET: 'Génération ticket',
  CANCEL_TICKET: 'Annulation ticket',
  CHECK_IN: 'Contrôle entrée',
  GRANT_ROLE: 'Attribution de rôle',
  REVOKE_ROLE: 'Retrait de rôle',
};

export function AuditPage() {
  const { can } = useAuth();
  const [action, setAction] = useState<string>('');
  const { data, loading, error, reload } = useAsync(
    () => AuditService.list({ action: action || undefined, limit: 200 }),
    [action],
  );

  if (!can('audit:read')) return <ForbiddenState />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Journal d'audit</h1>
        <p className="mt-1 text-sm text-slate-600">
          Actions administratives sensibles. Filtrage et limitation côté serveur
          (200 entrées les plus récentes).
        </p>
      </header>

      <Select
        aria-label="Filtrer par action"
        value={action}
        onChange={(e) => setAction(e.target.value)}
        className="max-w-xs"
      >
        <option value="">Toutes les actions</option>
        {Object.values(AuditAction).map((a) => (
          <option key={a} value={a}>
            {ACTION_LABELS[a] ?? a}
          </option>
        ))}
      </Select>

      {loading && <LoadingState label="Chargement du journal…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState title="Aucune entrée" description="Aucune action enregistrée pour ce filtre." />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Entité</th>
                <th scope="col" className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="brand">{ACTION_LABELS[log.action] ?? log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.entity_type}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500">
                    {summarize(log.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Résumé lisible des métadonnées, sans exposer de secret. */
function summarize(metadata: Record<string, unknown>): string {
  const SAFE_KEYS = [
    'ticket_number', 'reference', 'role', 'email', 'reason', 'notes',
    'total', 'inserted', 'skipped', 'errors',
  ];
  return (
    Object.entries(metadata ?? {})
      .filter(([k, v]) => SAFE_KEYS.includes(k) && v != null && v !== '')
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ') || '—'
  );
}
