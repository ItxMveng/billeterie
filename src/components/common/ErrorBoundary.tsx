import { Component, type ReactNode } from 'react';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Frontière d'erreur React globale : capture les erreurs de rendu, les
 * journalise proprement, et affiche un écran de repli sûr.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    logger.reportError(toAppError(error), { scope: 'ErrorBoundary' });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900">
              Une erreur est survenue
            </h1>
            <p className="max-w-md text-sm text-slate-600">
              L'application a rencontré un problème inattendu. Rechargez la page
              pour réessayer.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800"
            >
              Recharger la page
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
