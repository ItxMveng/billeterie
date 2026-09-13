import { useAsync } from '@/hooks/useAsync';
import { EventService } from '@/features/events/EventService';
import { SchoolService } from '@/features/schools/SchoolService';
import { paymentConfig, associationConfig } from '@/config/event.config';
import { formatDate, formatMoney } from '@/lib/utils';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';

/**
 * Paramètres : vue consolidée de la configuration réellement utilisée par
 * l'application (événement en base + configuration d'affichage). L'édition en
 * base se fait au Sprint 4 (voir SPRINT_3_REPORT — limitations).
 */
export function SettingsPage() {
  const event = useAsync(() => EventService.getActiveEvent(), []);
  const schools = useAsync(() => SchoolService.listAll(), []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configuration centralisée effectivement utilisée par l'application.
        </p>
      </header>

      {event.loading && <LoadingState />}
      {!event.loading && event.error && <ErrorState error={event.error} onRetry={event.reload} />}

      {!event.loading && !event.error && event.data && (
        <>
          {event.data.isPlaceholder && (
            <Alert tone="warning" title="Événement non publié en base">
              Les informations proviennent de la configuration de repli et doivent
              être confirmées avant la production.
            </Alert>
          )}
          <Card>
            <CardHeader><CardTitle>Événement</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Detail label="Nom" value={event.data.name} />
              <Detail label="Date" value={formatDate(event.data.date)} />
              <Detail label="Lieu" value={event.data.location ?? '—'} />
              <Detail label="Prix ancien" value={formatMoney(event.data.alumniPriceCents, event.data.currency)} />
              <Detail label="Prix invité" value={formatMoney(event.data.otherPriceCents, event.data.currency)} />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle>Paiement ({paymentConfig.provider})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {paymentConfig.isPlaceholder && (
            <Alert tone="warning">
              Coordonnées Wero non configurées : renseignez <code>VITE_WERO_BENEFICIARY</code>
              {' '}et <code>VITE_WERO_HANDLE</code> avant la production.
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Bénéficiaire" value={paymentConfig.beneficiary} />
            <Detail label="Contact / numéro" value={paymentConfig.phoneOrHandle} />
          </div>
          <p className="text-sm text-slate-600">{paymentConfig.instructions}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Écoles configurées</CardTitle></CardHeader>
        <CardContent>
          {schools.loading && <LoadingState />}
          {!schools.loading && schools.error && (
            <ErrorState error={schools.error} onRetry={schools.reload} />
          )}
          {!schools.loading && !schools.error && (
            <ul className="flex flex-wrap gap-2">
              {(schools.data ?? []).map((s) => (
                <li key={s.id}>
                  <Badge tone={s.is_active ? 'green' : 'neutral'}>
                    {s.short_name || s.name}
                  </Badge>
                </li>
              ))}
              {(schools.data?.length ?? 0) === 0 && (
                <li className="text-sm text-slate-500">Aucune école configurée.</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Association</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <Detail label="Nom" value={associationConfig.name} />
          <p className="text-sm text-slate-600">{associationConfig.shortDescription}</p>
        </CardContent>
      </Card>
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
