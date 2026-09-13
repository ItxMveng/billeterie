import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AppError } from '@/lib/errors';

/**
 * Affiche un message d'erreur SÛR pour l'utilisateur.
 * Les détails techniques ne sont jamais rendus ici (ils sont journalisés).
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error?: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof AppError
      ? error.userMessage
      : 'Une erreur inattendue est survenue. Réessayez plus tard.';

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
