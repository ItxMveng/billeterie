import { useCallback, useEffect, useState } from 'react';
import { toAppError, type AppError } from '@/lib/errors';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  reload: () => void;
}

/**
 * Petit hook de chargement de données asynchrone avec états
 * loading / error / data et fonction de rechargement.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fn()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(toAppError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  return { data, loading, error, reload };
}
