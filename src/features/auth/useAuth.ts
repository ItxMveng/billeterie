import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

/** Accès au contexte d'authentification. Lève si utilisé hors AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.');
  }
  return ctx;
}
