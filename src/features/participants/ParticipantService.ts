/**
 * ParticipantService — accès aux données des participants.
 *
 * L'inscription publique passe désormais par la RPC sécurisée
 * `register_participant` (les statuts sensibles sont posés côté serveur ; le
 * client ne peut pas les falsifier). La lecture reste réservée au staff (RLS).
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ParticipantRow } from '@/types/database';
import type { RegistrationValues } from '@/schemas/participant.schema';
import { ParticipantType, VerificationStatus } from '@/types/enums';

/** Résultat renvoyé par la RPC d'inscription (token à afficher une seule fois). */
export interface RegistrationResult {
  participantId: string;
  accessToken: string;
  paymentRequired: boolean;
  paymentReference: string | null;
  amountCents: number;
  currency: string;
}

export const ParticipantService = {
  /** Inscription publique via RPC sécurisée. */
  async register(
    values: RegistrationValues,
    eventId: string | null,
  ): Promise<RegistrationResult> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('register_participant', {
      payload: {
        event_id: eventId,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
        participant_type: values.participant_type,
        school_id: values.school_id ?? null,
      },
    });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'ParticipantService.register' });
      throw appError;
    }
    const d = data as Record<string, unknown>;
    return {
      participantId: String(d.participant_id),
      accessToken: String(d.access_token),
      paymentRequired: Boolean(d.payment_required),
      paymentReference: (d.payment_reference as string) ?? null,
      amountCents: Number(d.amount_cents ?? 0),
      currency: String(d.currency ?? 'EUR'),
    };
  },

  /** Liste des participants (admin uniquement — protégé par la RLS). */
  async list(): Promise<ParticipantRow[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'ParticipantService.list' });
      throw appError;
    }
    return (data ?? []) as ParticipantRow[];
  },

  /** Nouveaux étudiants en attente de vérification (file admin). */
  async listPendingVerification(): Promise<ParticipantRow[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('participant_type', ParticipantType.NEW_STUDENT)
      .eq('verification_status', VerificationStatus.PENDING)
      .order('created_at', { ascending: true });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'ParticipantService.listPendingVerification' });
      throw appError;
    }
    return (data ?? []) as ParticipantRow[];
  },
};
