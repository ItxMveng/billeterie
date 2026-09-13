import { useAsync } from '@/hooks/useAsync';
import { StatsService } from '@/features/stats/StatsService';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarList } from '@/components/ui/BarList';

export function StatisticsPage() {
  const overview = useAsync(() => StatsService.getOverview(), []);
  const series = useAsync(() => StatsService.getTimeSeries(30), []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Statistiques</h1>
        <p className="mt-1 text-sm text-slate-600">
          Données réelles agrégées côté serveur.
        </p>
      </header>

      {overview.loading && <LoadingState />}
      {!overview.loading && overview.error && (
        <ErrorState error={overview.error} onRetry={overview.reload} />
      )}

      {!overview.loading && !overview.error && overview.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Participants par catégorie</CardTitle></CardHeader>
            <CardContent>
              <BarList
                items={[
                  { label: 'Nouveaux étudiants', value: overview.data.new_students },
                  { label: 'Anciens', value: overview.data.alumni },
                  { label: 'Autres / Invités', value: overview.data.others },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Paiements par statut</CardTitle></CardHeader>
            <CardContent>
              <BarList
                items={Object.entries(overview.data.payment_breakdown).map(([k, v]) => ({
                  label: PAYMENT_STATUS_LABELS[k as PaymentStatus] ?? k,
                  value: v,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Répartition par école</CardTitle></CardHeader>
            <CardContent>
              <BarList
                items={overview.data.by_school.map((s) => ({ label: s.school, value: s.count }))}
                emptyLabel="Aucune école renseignée"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contrôle d'entrée</CardTitle></CardHeader>
            <CardContent>
              <BarList
                items={[
                  { label: 'Entrés', value: overview.data.checked_in },
                  { label: 'En attente', value: overview.data.not_checked_in },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Inscriptions (30 derniers jours)</CardTitle></CardHeader>
            <CardContent>
              {series.loading && <LoadingState />}
              {!series.loading && series.error && (
                <ErrorState error={series.error} onRetry={series.reload} />
              )}
              {!series.loading && !series.error && series.data && (
                <BarList
                  items={series.data.registrations.map((r) => ({ label: r.day, value: r.count }))}
                  emptyLabel="Aucune inscription sur la période"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
