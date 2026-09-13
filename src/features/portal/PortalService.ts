/**
 * PortalService — espace participant (accès par TOKEN privé, sans compte).
 *
 * Aucun accès par ID : le token (remis une fois à l'inscription) est la seule
 * clé. Toutes les opérations sont des RPC sécurisées côté serveur.
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type {
  ParticipantType,
  PaymentStatus,
  RegistrationStatus,
  TicketStatus,
  VerificationStatus,
} from '@/types/enums';

export interface ParticipantStatusView {
  first_name: string;
  participant_type: ParticipantType;
  verification_status: VerificationStatus;
  payment_required: boolean | null;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  registration_status: RegistrationStatus;
  ticket_status: TicketStatus;
  ticket_number: string | null;
}

export const PortalService = {
  /** Statut complet du participant (ou null si token invalide). */
  async getStatus(token: string): Promise<ParticipantStatusView | null> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('get_participant_status', {
      p_token: token,
    });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'PortalService.getStatus' });
      throw appError;
    }
    return (data as ParticipantStatusView | null) ?? null;
  },
};
