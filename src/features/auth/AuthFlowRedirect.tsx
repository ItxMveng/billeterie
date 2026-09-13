import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { peekAuthFlow } from './auth-flow';

const TARGET = '/definir-mot-de-passe';

/**
 * Redirige vers la définition du mot de passe lorsqu'un lien d'invitation ou de
 * réinitialisation vient d'être ouvert.
 *
 * Supabase renvoie toujours l'utilisateur vers le « Site URL » du projet (donc
 * la page d'accueil) : sans cette redirection, la personne arriverait sur la
 * landing page sans comprendre quoi faire.
 */
export function AuthFlowRedirect() {
  const { loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (pathname === TARGET) return;
    if (peekAuthFlow()) {
      navigate(TARGET, { replace: true });
    }
  }, [loading, isAuthenticated, pathname, navigate]);

  return null;
}
