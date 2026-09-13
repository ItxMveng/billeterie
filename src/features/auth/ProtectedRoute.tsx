import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { Permission } from './rbac';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import { ForbiddenState } from '@/components/common/ForbiddenState';

interface ProtectedRouteProps {
  /** Permission requise pour accéder à la route (optionnelle). */
  permission?: Permission;
}

/**
 * Garde de route :
 * - attend la résolution de l'état d'auth ;
 * - redirige vers /login si non authentifié (en mémorisant la destination) ;
 * - affiche un écran « accès refusé » si la permission manque.
 *
 * ⚠️ Rappel : ce garde protège la NAVIGATION. La donnée elle-même est
 * protégée par la RLS côté base.
 */
export function ProtectedRoute({ permission }: ProtectedRouteProps) {
  const { loading, isAuthenticated, can } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Vérification de la session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !can(permission)) {
    return <ForbiddenState />;
  }

  return <Outlet />;
}

/**
 * Garde de permission au niveau d'un élément (route feuille).
 * Affiche l'écran « accès refusé » si la permission manque.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <ForbiddenState />;
}
