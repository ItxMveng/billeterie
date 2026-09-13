import { useAsync } from '@/hooks/useAsync';
import { SchoolService } from '@/features/schools/SchoolService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/Badge';

export function SchoolsPage() {
  const { data, loading, error, reload } = useAsync(
    () => SchoolService.listAll(),
    [],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Écoles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Établissements configurables proposés aux anciens étudiants. La
          création/édition arrive dans un prochain sprint.
        </p>
      </header>

      {loading && <LoadingState label="Chargement des écoles…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="Aucune école"
          description="Ajoutez des écoles (ex. ENIB, IAI) via la base pour le moment."
        />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-medium text-slate-900">{s.name}</p>
                {s.short_name && (
                  <p className="text-xs text-slate-500">{s.short_name}</p>
                )}
              </div>
              <Badge tone={s.is_active ? 'green' : 'neutral'}>
                {s.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
