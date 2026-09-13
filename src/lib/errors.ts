/**
 * Gestion centralisée des erreurs.
 *
 * Objectifs :
 * - Fournir des erreurs typées par domaine (réseau, validation, autorisation…).
 * - Séparer le message TECHNIQUE (journalisé, jamais montré tel quel) du
 *   message UTILISATEUR (clair, sûr, sans détail sensible).
 * - Convertir les erreurs Supabase / réseau inconnues en `AppError` normalisée.
 */

export type ErrorKind =
  | 'NETWORK'
  | 'VALIDATION'
  | 'AUTH'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONFIG'
  | 'UNKNOWN';

const DEFAULT_USER_MESSAGES: Record<ErrorKind, string> = {
  NETWORK: 'Problème de connexion. Vérifiez votre réseau et réessayez.',
  VALIDATION: 'Certaines informations sont invalides. Veuillez les corriger.',
  AUTH: "Vous devez être connecté pour effectuer cette action.",
  AUTHORIZATION: "Vous n'avez pas les droits nécessaires pour cette action.",
  NOT_FOUND: "La ressource demandée est introuvable.",
  CONFLICT: 'Cette opération entre en conflit avec des données existantes.',
  CONFIG: "Le service n'est pas correctement configuré. Contactez un administrateur.",
  UNKNOWN: "Une erreur inattendue est survenue. Réessayez plus tard.",
};

export class AppError extends Error {
  readonly kind: ErrorKind;
  /** Message sûr, destiné à l'utilisateur final. */
  readonly userMessage: string;
  /** Cause d'origine, pour la journalisation. */
  readonly cause?: unknown;

  constructor(
    kind: ErrorKind,
    options: { userMessage?: string; technicalMessage?: string; cause?: unknown } = {},
  ) {
    super(options.technicalMessage ?? kind);
    this.name = 'AppError';
    this.kind = kind;
    this.userMessage = options.userMessage ?? DEFAULT_USER_MESSAGES[kind];
    this.cause = options.cause;
  }
}

/** Type minimal d'une erreur Supabase (postgrest / auth). */
interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
}

function isSupabaseLikeError(e: unknown): e is SupabaseLikeError {
  return (
    typeof e === 'object' &&
    e !== null &&
    ('message' in e || 'code' in e || 'status' in e)
  );
}

/**
 * Normalise n'importe quelle erreur en `AppError`. Ne relance jamais :
 * renvoie toujours une AppError exploitable par l'UI et la journalisation.
 */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;

  if (isSupabaseLikeError(e)) {
    const code = e.code ?? '';
    const status = e.status ?? 0;

    // Contrainte d'unicité PostgreSQL → conflit métier (doublon).
    if (code === '23505') {
      return new AppError('CONFLICT', {
        userMessage:
          'Une inscription existe déjà avec ces informations pour cette catégorie.',
        technicalMessage: e.message,
        cause: e,
      });
    }
    if (status === 401 || code === '401') {
      return new AppError('AUTH', { technicalMessage: e.message, cause: e });
    }
    if (status === 403 || code === '42501') {
      return new AppError('AUTHORIZATION', {
        technicalMessage: e.message,
        cause: e,
      });
    }
    if (status === 404) {
      return new AppError('NOT_FOUND', { technicalMessage: e.message, cause: e });
    }
    return new AppError('UNKNOWN', { technicalMessage: e.message, cause: e });
  }

  if (e instanceof TypeError && /fetch|network/i.test(e.message)) {
    return new AppError('NETWORK', { cause: e });
  }

  return new AppError('UNKNOWN', {
    technicalMessage: e instanceof Error ? e.message : String(e),
    cause: e,
  });
}
