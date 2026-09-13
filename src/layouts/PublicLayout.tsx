import { Link, NavLink, Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { associationConfig } from '@/config/event.config';

const navItem = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors',
    isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900',
  );

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-slate-900"
          >
            <GraduationCap className="h-6 w-6 text-brand-700" aria-hidden="true" />
            <span>Cérémonie d'accueil</span>
          </Link>
          <nav className="flex items-center gap-6" aria-label="Navigation principale">
            <NavLink to="/" end className={navItem}>
              Accueil
            </NavLink>
            <NavLink to="/mon-billet" className={navItem}>
              Mon espace
            </NavLink>
            <NavLink
              to="/inscription"
              className="inline-flex h-9 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              Je m'inscris
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="container flex flex-col gap-2 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {associationConfig.name}
            {associationConfig.isPlaceholder && (
              <span className="ml-1 text-xs text-amber-600">(placeholder)</span>
            )}
          </p>
          <p>© {new Date().getFullYear()} — Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
