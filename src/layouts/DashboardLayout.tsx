import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, LogOut, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { cn, formatDateShort } from '@/lib/utils';
import { useAuth } from '@/features/auth/useAuth';
import { useDashboardEvent } from '@/features/events/DashboardEventContext';
import { DASHBOARD_NAV } from '@/app/dashboard-nav';
import { EVENT_STATUS_LABELS, EventStatus, ROLE_LABELS } from '@/types/enums';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';

export function DashboardLayout() {
  const { user, roles, can, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = DASHBOARD_NAV.filter((item) => can(item.permission));

  const navLinks = (
    <nav className="flex flex-col gap-1" aria-label="Navigation du tableau de bord">
      {items.map(({ to, label, icon: Icon, end, upcoming }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {upcoming && (
            <Badge tone="amber" className="text-[10px]">
              bientôt
            </Badge>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <BrandLogo size={32} rounded="rounded-lg" />
            <span className="hidden sm:inline">Administration</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-800">{user?.email}</p>
            <p className="text-xs text-slate-500">
              {roles.length > 0
                ? roles.map((r) => ROLE_LABELS[r]).join(', ')
                : 'Aucun rôle'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signOut()}
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Barre latérale (desktop) */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
          {navLinks}
        </aside>

        {/* Tiroir mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute left-0 top-16 h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-slate-200 bg-white p-4">
              {navLinks}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <EventSwitcher />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Bandeau « Événement consulté » : rappelle sur chaque page à quel
 * événement correspondent les données affichées, et permet d'en changer.
 */
function EventSwitcher() {
  const { events, event, setEventId, loading } = useDashboardEvent();
  if (loading || events.length === 0) return null;

  const archived = event?.status === EventStatus.ARCHIVED;
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        archived ? 'border-amber-200 bg-amber-50' : 'border-brand-200 bg-brand-50',
      )}
    >
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Données de l'événement
          </p>
          <p className="truncate font-semibold text-slate-900">
            {event ? `${event.name} — ${formatDateShort(event.date)}` : '—'}
          </p>
        </div>
        {event && (
          <Badge tone={archived ? 'amber' : event.status === EventStatus.PUBLISHED ? 'green' : 'neutral'}>
            {EVENT_STATUS_LABELS[event.status]}
          </Badge>
        )}
      </div>
      {events.length > 1 && (
        <Select
          aria-label="Changer d'événement"
          className="sm:max-w-xs"
          value={event?.id ?? ''}
          onChange={(e) => setEventId(e.target.value)}
        >
          {[...events].reverse().map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} — {formatDateShort(ev.date)}
              {ev.status === EventStatus.ARCHIVED ? ' (archivé)' : ''}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
