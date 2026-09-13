/**
 * Détection des parcours d'authentification par email (Supabase).
 *
 * Supabase redirige les liens d'email (invitation, réinitialisation) vers le
 * « Site URL » du projet, en plaçant le jeton dans le FRAGMENT de l'URL :
 *   https://exemple.app/#access_token=...&type=invite
 *
 * Le client Supabase consomme puis efface ce fragment (`detectSessionInUrl`).
 * On capture donc le type de parcours AU DÉMARRAGE, avant cette consommation,
 * pour pouvoir rediriger l'utilisateur vers la définition de son mot de passe.
 */

const KEY = 'auth_flow';

export type AuthFlow = 'invite' | 'recovery';

/** À appeler tout au début de l'application (avant le rendu). */
export function captureAuthFlow(): void {
  try {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return;
    const type = new URLSearchParams(raw).get('type');
    if (type === 'invite' || type === 'recovery') {
      sessionStorage.setItem(KEY, type);
    }
  } catch {
    /* stockage indisponible : le parcours restera simplement manuel */
  }
}

/** Parcours en cours, le cas échéant. */
export function peekAuthFlow(): AuthFlow | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === 'invite' || v === 'recovery' ? v : null;
  } catch {
    return null;
  }
}

/** Termine le parcours (après définition du mot de passe). */
export function clearAuthFlow(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
