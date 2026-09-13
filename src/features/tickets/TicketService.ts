/**
 * TicketService — génération et consultation des tickets.
 *
 * Génération : côté serveur uniquement, via RPC sécurisée idempotente
 * (`admin_generate_ticket`) qui vérifie les conditions métier (canGenerateTicket).
 * Consultation participant : par TOKEN privé (aucune énumération d'ID).
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ParticipantType } from '@/types/enums';

export interface TicketView {
  ticket_number: string;
  first_name: string;
  last_name: string;
  participant_type: ParticipantType;
  school_name: string | null;
  event_name: string | null;
  event_date: string | null;
  event_location: string | null;
}

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

export const TicketService = {
  /** Récupère le ticket du participant via son token privé (ou null). */
  async getByToken(token: string): Promise<TicketView | null> {
    const data = await rpc<TicketView | null>('get_ticket_by_token', { p_token: token }, 'TicketService.getByToken');
    return data ?? null;
  },

  /** Génère (ou renvoie) le ticket d'un participant éligible. Admin, idempotent. */
  async generate(participantId: string): Promise<{ ticket_number: string }> {
    return rpc('admin_generate_ticket', { p_participant_id: participantId }, 'TicketService.generate');
  },

  /** Annule le ticket d'un participant. Admin. */
  async cancel(participantId: string, reason?: string): Promise<void> {
    await rpc('admin_cancel_ticket', { p_participant_id: participantId, p_reason: reason ?? null }, 'TicketService.cancel');
  },
};
