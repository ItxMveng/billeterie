import { useAsync } from '@/hooks/useAsync';
import { EventService } from '@/features/events/EventService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { formatDate, formatMoney } from '@/lib/utils';

export function EventPage() {
  const { data, loading, error, reload } = useAsync(
    () => EventService.getActiveEvent(),
    [],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Événement</h1>
        <p className="mt-1 text-sm text-slate-600">
          Détails de l'événement actif. L'édition sera disponible dans un
          prochain sprint.
        </p>
      </header>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && data && (
        <>
          {data.isPlaceholder && (
            <Alert tone="warning" title="Données de repli">
              Aucun événement publié n'a été trouvé en base. Les informations
              ci-dessous proviennent de la configuration de repli et doivent
              être confirmées.
            </Alert>
          )}
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Detail label="Nom" value={data.name} />
              <Detail label="Date" value={formatDate(data.date)} />
              <Detail label="Lieu" value={data.location ?? '—'} />
              <Detail
                label="Prix ancien (indicatif)"
                value={formatMoney(data.alumniPriceCents, data.currency)}
              />
              <Detail
                label="Prix invité (indicatif)"
                value={formatMoney(data.otherPriceCents, data.currency)}
              />
            </CardContent>
          </Card>
          <p className="text-xs text-slate-400">
            Les prix affichés sont indicatifs. Le montant réellement facturé est
            déterminé côté serveur au moment du paiement.
          </p>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}
