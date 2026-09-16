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

  /** Modifie un enregistrement de la liste officielle. Admin, audité. */
  async updateRecord(
    id: string,
    input: {
      first_name: string;
      last_name: string;
      email?: string | null;
      school_id?: string | null;
      external_identifier?: string | null;
    },
  ): Promise<void> {
    await rpc(
      'admin_update_verification_record',
      {
        p_record_id: id,
        p_first_name: input.first_name,
        p_last_name: input.last_name,
        p_email: input.email ?? null,
        p_school_id: input.school_id ?? null,
        p_external_identifier: input.external_identifier ?? null,
      },
      'VerificationService.updateRecord',
    );
  },

  /** Supprime un enregistrement de la liste officielle. Admin, audité. */
  async deleteRecord(id: string): Promise<void> {
    await rpc(
      'admin_delete_verification_record',
      { p_record_id: id },
      'VerificationService.deleteRecord',
    );
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
