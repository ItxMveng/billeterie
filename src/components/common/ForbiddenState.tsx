import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Écran « accès refusé » (permission RBAC insuffisante). */
export function ForbiddenState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <ShieldAlert className="h-10 w-10 text-amber-500" aria-hidden="true" />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Accès refusé</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
