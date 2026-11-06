import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  GraduationCap,
  UserRound,
  BadgeCheck,
  Ticket,
  ScanLine,
} from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { useDashboardEvent } from '@/features/events/DashboardEventContext';
import { StatsService, cpbaGuests } from '@/features/stats/StatsService';
import { ROLE_LABELS } from '@/types/enums';
import { StatTile } from '@/components/ui/StatTile';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';

export function DashboardHome() {
  const { user, roles } = useAuth();
  const { eventId } = useDashboardEvent();
  const { data, loading, error, reload } = useAsync(
    () => (eventId ? StatsService.getOverview(eventId) : Promise.resolve(null)),
    [eventId],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bienvenue, {user?.email}
          {roles.length > 0 && <> — {roles.map((r) => ROLE_LABELS[r]).join(', ')}</>}.
        </p>
      </header>

      {loading && <LoadingState label="Chargement des statistiques…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Inscrits" value={data.participants_total} icon={Users} />
            <StatTile label="Diplômés" value={data.alumni} icon={GraduationCap} />
            <StatTile label="Familles / invités des diplômés" value={data.others} icon={UserRound} tone="slate" />
            <StatTile label="Invités CPBA" value={cpbaGuests(data)} icon={UserRound} tone="slate" />
            <StatTile label="Étudiants" value={data.new_students} icon={UserPlus} tone="slate" />
            <StatTile label="Vérifications en attente" value={data.verification_pending} icon={BadgeCheck} tone="amber" />
            <StatTile label="Tickets générés" value={data.tickets_generated} icon={Ticket} tone="green" />
            <StatTile label="Tickets non générés" value={data.tickets_not_generated} icon={Ticket} tone="slate" />
            <StatTile label="Check-in effectués" value={data.checked_in} icon={ScanLine} tone="green" />
            <StatTile label="En attente d'entrée" value={data.not_checked_in} icon={ScanLine} tone="amber" />
          </div>

          <div className="flex flex-wrap gap-3">
            <QuickLink to="/dashboard/statistiques" label="Statistiques détaillées" />
            <QuickLink to="/dashboard/plan-de-salle" label="Plan de salle" />
            <QuickLink to="/dashboard/participants" label="Gérer les participants" />
            <QuickLink to="/dashboard/scanner" label="Scanner" />
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}
