import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-brand-700">404</p>
      <h1 className="text-xl font-semibold text-slate-900">Page introuvable</h1>
      <p className="max-w-md text-sm text-slate-600">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        to="/"
        className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
