/**
 * VerificationService — vérification des nouveaux étudiants (admin).
 *
 * La décision VERIFIED/REJECTED est prise côté serveur via RPC sécurisées
 * (contrôle de rôle + audit). Le matching est proposé côté client (logique
 * pure) mais ne décide jamais seul.
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { StudentVerificationRecordRow } from '@/types/database';

async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown>,
  scope: string,
): Promise<T> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const appError = toAppError(error);
    logger.reportError(appError, { scope });
    throw appError;
  }
  return data as T;
}

export const VerificationService = {
  /** Liste des enregistrements officiels disponibles (pour le matching). */
  async listRecords(): Promise<StudentVerificationRecordRow[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('student_verification_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'VerificationService.listRecords' });
      throw appError;
    }
    return (data ?? []) as StudentVerificationRecordRow[];
  },

  /** Vérifie un nouveau étudiant (VERIFIED). Idempotent, audité. */
  async verify(participantId: string, notes?: string): Promise<{ ticket_number: string | null }> {
    return rpc('admin_verify_student', { p_participant_id: participantId, p_notes: notes ?? null }, 'VerificationService.verify');
  },

  /** Rejette un nouveau étudiant (REJECTED). Audité. */
  async reject(participantId: string, reason?: string): Promise<void> {
    await rpc('admin_reject_student', { p_participant_id: participantId, p_reason: reason ?? null }, 'VerificationService.reject');
  },
};
