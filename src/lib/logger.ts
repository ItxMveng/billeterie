/**
 * Journalisation centralisée.
 *
 * - En développement : sortie console détaillée.
 * - En production : point d'extension unique pour brancher plus tard un
 *   service (Sentry, Logtail…). On évite d'exposer des détails techniques
 *   à l'utilisateur ; ceux-ci ne transitent que par le logger.
 */

import { AppError } from './errors';

type LogContext = Record<string, unknown>;

function emit(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: LogContext,
): void {
  if (import.meta.env.DEV) {
    console[level](`[${level}] ${message}`, context ?? '');
  }
  // Sprint 2+ : envoyer vers un collecteur distant en production.
}

export const logger = {
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),

  /** Journalise une AppError avec sa cause technique (jamais montrée à l'UI). */
  reportError: (error: AppError, context?: LogContext) => {
    emit('error', `${error.kind}: ${error.message}`, {
      ...context,
      cause: error.cause,
    });
  },
};
