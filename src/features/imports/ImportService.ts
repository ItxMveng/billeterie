/**
 * ImportService — import CSV des participants et de la liste de vérification.
 *
 * L'insertion se fait via RPC sécurisées (dédup + idempotence + audit côté
 * serveur). Le client ne fait que parser, valider et prévisualiser.
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface ImportSummary {
  batch_id: string;
  total: number;
  inserted: number;
  skipped: number;
  errors: number;
  issues: Array<Record<string, unknown>>;
  tokens?: Array<{ email: string; access_token: string }>;
}

async function rpc(
  name: string,
  args: Record<string, unknown>,
  scope: string,
): Promise<ImportSummary> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const appError = toAppError(error);
    logger.reportError(appError, { scope });
    throw appError;
  }
  return data as ImportSummary;
}

export const ImportService = {
  /** Importe des participants (dédup par email + événement). */
  async importParticipants(
    rows: Array<Record<string, unknown>>,
    filename?: string,
  ): Promise<ImportSummary> {
    return rpc('import_participants', { p_rows: rows, p_filename: filename ?? null }, 'ImportService.importParticipants');
  },

  /** Importe la liste officielle de vérification. */
  async importVerificationRecords(
    rows: Array<Record<string, unknown>>,
    filename?: string,
  ): Promise<ImportSummary> {
    return rpc('import_verification_records', { p_rows: rows, p_filename: filename ?? null }, 'ImportService.importVerificationRecords');
  },
};
