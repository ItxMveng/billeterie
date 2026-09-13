/**
 * PaymentService — paiements (Wero V1 : déclaration utilisateur + confirmation
 * administrative). Aucune preuve de paiement n'est acceptée depuis le client :
 * seul un administrateur autorisé peut confirmer (RPC `admin_confirm_payment`).
 *
 * Le montant réellement facturé est déterminé côté serveur (register/confirm) ;
 * `getDisplayAmountCents` reste purement indicatif (délégué à payment.logic).
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { PaymentWithParticipant } from '@/types/database';
import { PaymentStatus } from '@/types/enums';
import { getDisplayAmountCents } from './payment.logic';

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

export const PaymentService = {
  /** Montant indicatif (centimes) — délégué à la logique pure. */
  getDisplayAmountCents,

  /**
   * Déclaration utilisateur « j'ai effectué le paiement ». Ne confirme JAMAIS
   * le paiement : passe seulement PENDING → AWAITING_CONFIRMATION.
   */
  async submitDeclaration(token: string): Promise<{ status: string }> {
    return rpc('submit_payment_declaration', { p_token: token }, 'PaymentService.submitDeclaration');
  },

  /** Paiements en attente (admin/finance — protégé par la RLS). */
  async listPending(): Promise<PaymentWithParticipant[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('payments')
      .select(
        '*, participant:participants(first_name,last_name,email,participant_type)',
      )
      .in('status', [PaymentStatus.PENDING, PaymentStatus.AWAITING_CONFIRMATION])
      .order('created_at', { ascending: true });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'PaymentService.listPending' });
      throw appError;
    }
    return (data ?? []) as PaymentWithParticipant[];
  },

  /** Tous les paiements avec participant (admin/finance — export). */
  async listAll(): Promise<PaymentWithParticipant[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('payments')
      .select('*, participant:participants(first_name,last_name,email,participant_type)')
      .order('created_at', { ascending: false });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'PaymentService.listAll' });
      throw appError;
    }
    return (data ?? []) as PaymentWithParticipant[];
  },

  /** Confirmation administrative (FINANCE/ADMIN/SUPER_ADMIN). Idempotente. */
  async confirm(paymentId: string, method?: string): Promise<{ ticket_number: string | null }> {
    return rpc('admin_confirm_payment', { p_payment_id: paymentId, p_method: method ?? null }, 'PaymentService.confirm');
  },

  /** Rejet administratif d'un paiement. */
  async reject(paymentId: string, reason?: string): Promise<void> {
    await rpc('admin_reject_payment', { p_payment_id: paymentId, p_reason: reason ?? null }, 'PaymentService.reject');
  },

  /** Exemption (dirigeants/officiels) : payment_required = false. Auditée. */
  async waive(participantId: string, reason?: string): Promise<{ ticket_number: string | null }> {
    return rpc('admin_waive_payment', { p_participant_id: participantId, p_reason: reason ?? null }, 'PaymentService.waive');
  },
};
