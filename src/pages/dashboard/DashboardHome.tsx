import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, School, CalendarDays } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { SchoolService } from '@/features/schools/SchoolService';
import { Card, CardContent } from '@/components/ui/Card';
import { ROLE_LABELS } from '@/types/enums';

export function DashboardHome() {
  const { user, roles, can } = useAuth();
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [schoolCount, setSchoolCount] = useState<number | null>(null);

  useEffect(() => {
    if (can('participants:read')) {
      void ParticipantService.list()
        .then((rows) => setParticipantCount(rows.length))
        .catch(() => setParticipantCount(null));
    }
    if (can('schools:read')) {
      void SchoolService.listAll()
        .then((rows) => setSchoolCount(rows.length))
        .catch(() => setSchoolCount(null));
    }
  }, [can]);

  const tiles = [
    {
      show: can('participants:read'),
      to: '/dashboard/participants',
      icon: Users,
      label: 'Participants',
      value: participantCount,
    },
    {
      show: can('schools:read'),
      to: '/dashboard/ecoles',
      icon: School,
      label: 'Écoles',
      value: schoolCount,
    },
    {
      show: can('events:read'),
      to: '/dashboard/evenement',
      icon: CalendarDays,
      label: 'Événement',
      value: null,
    },
  ].filter((t) => t.show);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bienvenue, {user?.email}
          {roles.length > 0 && (
            <> — {roles.map((r) => ROLE_LABELS[r]).join(', ')}</>
          )}
          .
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ to, icon: Icon, label, value }) => (
          <Link key={to} to={to} className="block">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="rounded-lg bg-brand-50 p-3">
                  <Icon className="h-6 w-6 text-brand-700" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {value ?? '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
