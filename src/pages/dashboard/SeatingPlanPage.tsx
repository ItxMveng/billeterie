import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download, GraduationCap, Users, AlertTriangle, Award, UserPlus } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useDashboardEvent } from '@/features/events/DashboardEventContext';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { TicketService } from '@/features/tickets/TicketService';
import { buildSeatingPlan } from '@/features/seating/seating';
import { GRADUATES } from '@/config/graduates';
import { toCsv, downloadCsv } from '@/lib/export-csv';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';
import type { ParticipantRow } from '@/types/database';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface CsvRow {
  groupe: string;
  p: ParticipantRow;
}

export function SeatingPlanPage() {
  const { eventId, event } = useDashboardEvent();
  const { data, loading, error, reload } = useAsync(
    () =>
      eventId
        ? Promise.all([ParticipantService.list(eventId), TicketService.listAll(eventId)])
        : Promise.resolve(null),
    [eventId],
  );

  const plan = useMemo(() => (data ? buildSeatingPlan(data[0], GRADUATES) : null), [data]);
  const ticketOf = useMemo(
    () =>
      new Map(
        (data?.[1] ?? [])
          .filter((t) => t.status !== 'CANCELLED')
          .map((t) => [t.participant_id, t.ticket_number]),
      ),
    [data],
  );

  const exportCsv = () => {
    if (!plan) return;
    const rows: CsvRow[] = [];
    for (const g of plan.groups) {
      if (g.graduateRegistration) rows.push({ groupe: g.graduate, p: g.graduateRegistration });
      for (const guest of g.guests) rows.push({ groupe: g.graduate, p: guest });
    }
    for (const p of plan.unassignedFamilies) rows.push({ groupe: 'Famille sans diplômé indiqué', p });
    for (const p of plan.otherGraduates) rows.push({ groupe: 'Diplômé à rattacher', p });
    for (const p of plan.cpbaGuests) rows.push({ groupe: 'Invités CPBA', p });
    for (const p of plan.students) rows.push({ groupe: 'Étudiants', p });

    const csv = toCsv<CsvRow>(rows, [
      { key: 'groupe', header: 'Table / groupe' },
      { key: 'role', header: 'Rôle', format: (r) => (r.p.participant_type === 'ALUMNI' ? 'Diplômé(e)' : 'Invité(e)') },
      { key: 'nom', header: 'Nom', format: (r) => r.p.last_name.toUpperCase() },
      { key: 'prenom', header: 'Prénom', format: (r) => r.p.first_name },
      { key: 'categorie', header: 'Catégorie', format: (r) => PARTICIPANT_TYPE_LABELS[r.p.participant_type] },
      { key: 'invite_de', header: 'Invité(e) de', format: (r) => (r.p.guest_of ?? []).join(', ') },
      { key: 'telephone', header: 'Téléphone', format: (r) => r.p.phone },
      { key: 'email', header: 'Email', format: (r) => r.p.email },
      { key: 'billet', header: 'N° de billet', format: (r) => ticketOf.get(r.p.id) ?? '' },
      { key: 'entre', header: 'Entré(e)', format: (r) => (r.p.checked_in ? 'Oui' : 'Non') },
    ]);
    downloadCsv(`plan-de-salle_${event?.date ?? 'evenement'}.csv`, csv);
  };

  const linkedGuests = plan ? new Set(plan.groups.flatMap((g) => g.guests.map((x) => x.id))).size : 0;
  const registeredGraduates = plan ? plan.groups.filter((g) => g.graduateRegistration).length : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan de salle</h1>
          <p className="mt-1 text-sm text-slate-600">
            Chaque diplômé avec les familles et invités qui l'ont choisi à
            l'inscription. Un invité de deux diplômés apparaît dans les deux
            groupes. Les billets annulés ne sont pas comptés.
          </p>
        </div>
        <Button onClick={exportCsv} disabled={!plan}>
          <Download className="h-4 w-4" aria-hidden="true" /> Exporter le plan (Excel)
        </Button>
      </header>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && plan && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Diplômés inscrits" value={`${registeredGraduates} / ${GRADUATES.length}`} icon={GraduationCap} />
            <StatTile label="Invités rattachés" value={linkedGuests} icon={Users} tone="green" />
            <StatTile label="Familles sans diplômé" value={plan.unassignedFamilies.length} icon={AlertTriangle} tone="amber" />
            <StatTile label="Invités CPBA" value={plan.cpbaGuests.length} icon={Award} tone="slate" />
            <StatTile label="Étudiants" value={plan.students.length} icon={UserPlus} tone="slate" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {plan.groups.map((g) => (
              <Card key={g.graduate}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle>{g.graduate}</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      {g.guests.length} invité{g.guests.length > 1 ? 's' : ''} — table de{' '}
                      {g.guests.length + 1} personne{g.guests.length > 0 ? 's' : ''}
                    </p>
                  </div>
                  {g.graduateRegistration ? (
                    <Link to={`/dashboard/participants/${g.graduateRegistration.id}`}>
                      <Badge tone="green">Inscrit(e)</Badge>
                    </Link>
                  ) : (
                    <Badge tone="amber">Pas encore inscrit(e)</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {g.guests.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucun invité pour l'instant.</p>
                  ) : (
                    <PeopleList people={g.guests} ticketOf={ticketOf} current={g.graduate} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {plan.unassignedFamilies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Familles sans diplômé indiqué</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert tone="warning">
                  Ces personnes se sont inscrites avant l'ajout du choix du
                  diplômé. Ouvrez leur fiche, puis « Modifier », pour les
                  rattacher.
                </Alert>
                <PeopleList people={plan.unassignedFamilies} ticketOf={ticketOf} />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <SimpleGroup title="Invités CPBA" people={plan.cpbaGuests} ticketOf={ticketOf} />
            <SimpleGroup title="Étudiants" people={plan.students} ticketOf={ticketOf} />
            {plan.otherGraduates.length > 0 && (
              <SimpleGroup
                title="Diplômés inscrits à rattacher"
                hint="Ces personnes sont inscrites. Vérifiez à quel groupe rattacher chaque inscription."
                people={plan.otherGraduates}
                ticketOf={ticketOf}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SimpleGroup({
  title,
  hint,
  people,
  ticketOf,
}: {
  title: string;
  hint?: string;
  people: ParticipantRow[];
  ticketOf: Map<string, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} <span className="font-normal text-slate-400">({people.length})</span>
        </CardTitle>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-slate-400">Personne pour l'instant.</p>
        ) : (
          <PeopleList people={people} ticketOf={ticketOf} />
        )}
      </CardContent>
    </Card>
  );
}

function PeopleList({
  people,
  ticketOf,
  current,
}: {
  people: ParticipantRow[];
  ticketOf: Map<string, string>;
  /** Diplômé du groupe : les autres diplômés choisis sont rappelés. */
  current?: string;
}) {
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {people.map((p) => {
        const others = (p.guest_of ?? []).filter((g) => g !== current);
        return (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <Link
                to={`/dashboard/participants/${p.id}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {p.last_name.toUpperCase()} {p.first_name}
              </Link>
              <p className="truncate text-xs text-slate-500">
                {p.phone}
                {current && others.length > 0 && <> — aussi invité(e) de {others.join(', ')}</>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="hidden font-mono text-xs text-slate-400 sm:inline">
                {ticketOf.get(p.id) ?? ''}
              </span>
              <Badge tone={p.checked_in ? 'green' : 'neutral'}>
                {p.checked_in ? 'Entré(e)' : 'Attendu(e)'}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
