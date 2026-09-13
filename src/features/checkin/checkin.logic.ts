/**
 * Logique pure du contrôle d'entrée — extraction du token et présentation.
 *
 * Le résultat métier est décidé côté serveur (RPC atomique `validate_checkin`).
 * Ce module ne fait que : extraire le token d'un QR scanné et traduire le code
 * de résultat en présentation (libellé, tonalité, autorisation d'entrée).
 */

export type CheckinResult =
  | 'VALID'
  | 'ALREADY_USED'
  | 'CANCELLED'
  | 'PAYMENT_UNPAID'
  | 'NOT_ELIGIBLE'
  | 'NO_TICKET'
  | 'INVALID'
  | 'ERROR';

/**
 * Extrait le token d'une valeur scannée. Le QR encode une URL
 * `.../checkin?t=<token>` ; on accepte aussi un token brut par robustesse.
 */
export function extractToken(scanned: string): string {
  const value = (scanned ?? '').trim();
  if (!value) return '';
  // Tente d'analyser une URL et d'en extraire le paramètre `t`.
  try {
    const url = new URL(value);
    const t = url.searchParams.get('t');
    if (t) return t.trim();
  } catch {
    // pas une URL : peut-être `checkin?t=...` ou un token brut
  }
  const match = value.match(/[?&]t=([^&\s]+)/);
  if (match && match[1]) return decodeURIComponent(match[1]);
  return value;
}

export interface CheckinPresentation {
  label: string;
  /** Tonalité d'affichage (couleur). */
  tone: 'success' | 'error' | 'warning';
  /** L'entrée est-elle autorisée ? (uniquement VALID) */
  allowEntry: boolean;
}

const PRESENTATION: Record<CheckinResult, CheckinPresentation> = {
  VALID: { label: 'ENTRÉE AUTORISÉE', tone: 'success', allowEntry: true },
  ALREADY_USED: { label: 'TICKET DÉJÀ UTILISÉ', tone: 'warning', allowEntry: false },
  CANCELLED: { label: 'TICKET ANNULÉ', tone: 'error', allowEntry: false },
  PAYMENT_UNPAID: { label: 'PAIEMENT NON VALIDÉ', tone: 'error', allowEntry: false },
  NOT_ELIGIBLE: { label: 'NON ÉLIGIBLE', tone: 'error', allowEntry: false },
  NO_TICKET: { label: 'AUCUN TICKET', tone: 'error', allowEntry: false },
  INVALID: { label: 'TICKET INVALIDE', tone: 'error', allowEntry: false },
  ERROR: { label: 'ERREUR — RÉESSAYEZ', tone: 'error', allowEntry: false },
};

export function presentCheckin(result: CheckinResult): CheckinPresentation {
  return PRESENTATION[result] ?? PRESENTATION.ERROR;
}
