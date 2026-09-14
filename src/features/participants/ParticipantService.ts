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
import type {
  ParticipantRow,
  PaymentRow,
  TicketRow,
  CheckinRow,
} from '@/types/database';
import type { RegistrationValues } from '@/schemas/participant.schema';
import {
  ParticipantType,
  VerificationStatus,
  type PaymentStatus,
  type TicketStatus,
} from '@/types/enums';

export interface ParticipantFilters {
  q?: string;
  participant_type?: ParticipantType;
  verification_status?: VerificationStatus;
  payment_status?: PaymentStatus;
  ticket_status?: TicketStatus;
  checked_in?: boolean;
  school_id?: string;
}

export interface ParticipantDetail {
  participant: ParticipantRow;
  payments: PaymentRow[];
  ticket: TicketRow | null;
  checkins: CheckinRow[];
}

/** Résultat renvoyé par la RPC d'inscription (token à afficher une seule fois). */
export interface RegistrationResult {
  participantId: string;
  accessToken: string;
  paymentRequired: boolean;
  paymentReference: string | null;
  amountCents: number;
  currency: string;
  /** Statut de vérification à l'issue de l'inscription (décidé serveur). */
  verificationStatus: VerificationStatus;
  /** true si la vérification automatique a réussi (liste officielle). */
  autoVerified: boolean;
  /** Numéro de billet si émis immédiatement. */
  ticketNumber: string | null;
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
        external_identifier: values.external_identifier || null,
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
      verificationStatus: (d.verification_status as VerificationStatus) ?? 'NOT_REQUIRED',
      autoVerified: Boolean(d.auto_verified),
      ticketNumber: (d.ticket_number as string) ?? null,
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

  /**
   * Recherche filtrée et paginée (admin). La recherche texte porte sur nom,
   * prénom, email, téléphone et référence de paiement. Résultats plafonnés.
   */
  async search(filters: ParticipantFilters = {}, limit = 200): Promise<ParticipantRow[]> {
    const supabase = requireSupabase();
    let query = supabase.from('participants').select('*');

    if (filters.participant_type) query = query.eq('participant_type', filters.participant_type);
    if (filters.verification_status) query = query.eq('verification_status', filters.verification_status);
    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);
    if (filters.ticket_status) query = query.eq('ticket_status', filters.ticket_status);
    if (typeof filters.checked_in === 'boolean') query = query.eq('checked_in', filters.checked_in);
    if (filters.school_id) query = query.eq('school_id', filters.school_id);

    if (filters.q && filters.q.trim()) {
      // Nettoyage : retire les caractères qui casseraient le filtre `.or()`.
      const q = filters.q.trim().replace(/[,()%]/g, ' ').trim();
      if (q) {
        query = query.or(
          [
            `first_name.ilike.%${q}%`,
            `last_name.ilike.%${q}%`,
            `email.ilike.%${q}%`,
            `phone.ilike.%${q}%`,
            `payment_reference.ilike.%${q}%`,
          ].join(','),
        );
      }
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'ParticipantService.search' });
      throw appError;
    }
    return (data ?? []) as ParticipantRow[];
  },

  /** Fiche détaillée (participant + paiements + ticket + check-ins). */
  async getDetail(id: string): Promise<ParticipantDetail> {
    const supabase = requireSupabase();
    const { data: participant, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'ParticipantService.getDetail' });
      throw appError;
    }
    // Paiements/tickets/checkins : soumis à la RLS ; renvoient [] si non lisibles.
    const [payments, ticket, checkins] = await Promise.all([
      supabase.from('payments').select('*').eq('participant_id', id).order('created_at', { ascending: false }),
      supabase.from('tickets').select('*').eq('participant_id', id).maybeSingle(),
      supabase.from('checkins').select('*').eq('participant_id', id).order('checked_in_at', { ascending: false }),
    ]);

    return {
      participant: participant as ParticipantRow,
      payments: (payments.data ?? []) as PaymentRow[],
      ticket: (ticket.data as TicketRow | null) ?? null,
      checkins: (checkins.data ?? []) as CheckinRow[],
    };
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
