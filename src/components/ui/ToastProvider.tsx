import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import {
  ToastContext,
  type ToastApi,
  type ToastMessage,
  type ToastTone,
} from './toast-context';

const AUTO_DISMISS_MS = 5000;

const STYLES: Record<ToastTone, { box: string; icon: typeof Info }> = {
  success: { box: 'border-green-200 bg-green-50 text-green-900', icon: CheckCircle2 },
  error: { box: 'border-red-200 bg-red-50 text-red-900', icon: XCircle },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle },
  info: { box: 'border-navy-200 bg-white text-navy-900', icon: Info },
};

/**
 * Notifications éphémères, accessibles.
 *
 * - Les erreurs sont annoncées immédiatement (`role="alert"`), les autres
 *   messages poliment (`role="status"`), sans voler le focus.
 * - Disparition automatique après 5 s, fermeture manuelle toujours possible.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, title?: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, tone, message, title }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, t) => push('success', m, t),
      error: (m, t) => push('error', m, t),
      info: (m, t) => push('info', m, t),
      warning: (m, t) => push('warning', m, t),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:items-end"
      >
        {toasts.map((t) => {
          const { box, icon: Icon } = STYLES[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lift animate-fade-up ' +
                box
              }
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className={t.title ? 'mt-0.5' : ''}>{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Fermer la notification"
                className="-m-1 rounded p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
