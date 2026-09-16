import { useContext } from 'react';
import { ToastContext, type ToastApi } from './toast-context';

/** Accès aux notifications. Lève si utilisé hors <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l\'intérieur de <ToastProvider>.');
  }
  return ctx;
}
