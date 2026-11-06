import { useMemo } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useDashboardEvent } from '@/features/events/DashboardEventContext';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { buildSeatingPlan } from '@/features/seating/seating';
import { GRADUATES } from '@/config/graduates';
import { StatsService, cpbaGuests } from '@/features/stats/StatsService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarList } from '@/components/ui/BarList';

export function StatisticsPage() {
  const { eventId } = useDashboardEvent();
  const overview = useAsync(
    () => (eventId ? StatsService.getOverview(eventId) : Promise.resolve(null)),
    [eventId],
  );
  const series = useAsync(
    () => (eventId ? StatsService.getTimeSeries(eventId, 30) : Promise.resolve(null)),
    [eventId],
  );
  const participants = useAsync(
    () => (eventId ? ParticipantService.list(eventId) : Promise.resolve(null)),
    [eventId],
  );
  const guestsByGraduate = useMemo(() => {
    if (!participants.data) return [];
    const plan = buildSeatingPlan(participants.data, GRADUATES);
    return [
      ...plan.groups
        .map((g) => ({ label: g.graduate, value: g.guests.length }))
        .sort((a, b) => b.value - a.value),
      ...(plan.unassignedFamilies.length > 0
        ? [{ label: 'Sans diplômé indiqué', value: plan.unassignedFamilies.length }]
        : []),
    ];
  }, [participants.data]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Statistiques</h1>
        <p className="mt-1 text-sm text-slate-600">
          Chiffres de l'événement sélectionné uniquement.
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
                  { label: 'Diplômés', value: overview.data.alumni },
                  { label: 'Familles / invités des diplômés', value: overview.data.others },
                  { label: 'Invités CPBA', value: cpbaGuests(overview.data) },
                  { label: 'Étudiants', value: overview.data.new_students },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Familles / invités par diplômé</CardTitle></CardHeader>
            <CardContent>
              <BarList items={guestsByGraduate} emptyLabel="Aucun invité pour l'instant" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Répartition par école (étudiants)</CardTitle></CardHeader>
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
