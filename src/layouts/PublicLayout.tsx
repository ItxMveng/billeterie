import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, X, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { associationConfig } from '@/config/event.config';

const SECTIONS = [
  { href: '/#a-propos', label: 'À propos' },
  { href: '/#programme', label: 'Programme' },
  { href: '/#categories', label: 'Catégories' },
  { href: '/#faq', label: 'FAQ' },
];

function Logo({ light }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded-lg"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-glow">
        <GraduationCap className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            'block font-display text-xl font-extrabold',
            light ? 'text-white' : 'text-navy-900',
          )}
        >
          Bienvenue
        </span>
        <span
          className={cn(
            'block text-[11px] font-medium tracking-wide',
            light ? 'text-navy-200' : 'text-navy-500',
          )}
        >
          Nouveaux · Ensemble
        </span>
      </span>
    </Link>
  );
}

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-50 border-b border-navy-100 bg-cream/85 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between gap-4">
          <Logo />

          <nav
            className="hidden items-center gap-8 lg:flex"
            aria-label="Navigation principale"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'relative text-sm font-medium transition-colors',
                  isActive && pathname === '/'
                    ? 'text-navy-900'
                    : 'text-navy-600 hover:text-navy-900',
                )
              }
            >
              Accueil
            </NavLink>
            {SECTIONS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="text-sm font-medium text-navy-600 transition-colors hover:text-navy-900"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/mon-billet"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 text-sm font-semibold text-navy-800 transition-colors hover:border-navy-300 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <Ticket className="h-4 w-4" aria-hidden="true" />
              Mon espace
            </Link>
            <Link
              to="/inscription"
              className="inline-flex h-11 items-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
            >
              Je m'inscris
            </Link>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-navy-200 bg-white text-navy-800 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu mobile */}
        {open && (
          <div className="border-t border-navy-100 bg-cream lg:hidden">
            <nav className="container flex flex-col py-4" aria-label="Navigation mobile">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 font-medium text-navy-800 hover:bg-navy-50"
              >
                Accueil
              </Link>
              {SECTIONS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-3 font-medium text-navy-800 hover:bg-navy-50"
                >
                  {s.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  to="/mon-billet"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white font-semibold text-navy-800"
                >
                  <Ticket className="h-4 w-4" aria-hidden="true" />
                  Mon espace
                </Link>
                <Link
                  to="/inscription"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-500 font-semibold text-white"
                >
                  Je m'inscris
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="relative isolate overflow-hidden bg-navy-950 text-navy-200">
        <div aria-hidden="true" className="grain absolute inset-0" />
        <div className="container relative py-14">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Logo light />
              <p className="mt-4 max-w-xs text-sm leading-relaxed">
                {associationConfig.shortDescription}
              </p>
            </div>

            <nav aria-label="Liens de bas de page">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                Navigation
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/" className="transition-colors hover:text-brand-300">
                    Accueil
                  </Link>
                </li>
                {SECTIONS.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} className="transition-colors hover:text-brand-300">
                      {s.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link to="/inscription" className="transition-colors hover:text-brand-300">
                    S'inscrire
                  </Link>
                </li>
              </ul>
            </nav>

            <div>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                L'association
              </h2>
              <p className="mt-4 text-sm">
                {associationConfig.name}
                {associationConfig.isPlaceholder && (
                  <span className="ml-1 text-xs text-brand-300">(à confirmer)</span>
                )}
              </p>
              <p className="mt-2 text-sm">
                <a
                  href={`mailto:${associationConfig.contactEmail}`}
                  className="transition-colors hover:text-brand-300"
                >
                  {associationConfig.contactEmail}
                </a>
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} — Tous droits réservés.</p>
            <p>Une communauté, un avenir.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
