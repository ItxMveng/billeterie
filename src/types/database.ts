/**
 * Types de données alignés sur le schéma PostgreSQL (Supabase).
 *
 * Ces interfaces représentent les LIGNES telles que stockées en base.
 * Elles sont volontairement écrites à la main (et non générées) pour le
 * Sprint 1 ; au Sprint 2 on pourra basculer vers les types générés par
 * `supabase gen types` sans changer les frontières d'architecture.
 */

import type {
  EventStatus,
  ParticipantType,
  PaymentStatus,
  PaymentProvider,
  RegistrationStatus,
  Role,
  TicketStatus,
  VerificationStatus,
  VerificationRecordStatus,
} from './enums';

export interface EventRow {
  id: string;
  name: string;
  description: string | null;
  date: string; // ISO date (YYYY-MM-DD)
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  location: string | null;
  status: EventStatus;
  alumni_price_cents: number;
  other_price_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolRow {
  id: string;
  name: string;
  short_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRow {
  id: string;
  event_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  participant_type: ParticipantType;
  school_id: string | null;
  verification_status: VerificationStatus;
  payment_status: PaymentStatus;
  payment_required: boolean | null;
  payment_reference: string | null;
  registration_status: RegistrationStatus;
  ticket_status: TicketStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejected_reason: string | null;
  source: string;
  /** Numéro étudiant officiel — facultatif, fiabilise la vérification. */
  external_identifier: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  participant_id: string;
  event_id: string | null;
  provider: PaymentProvider | string;
  reference: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TicketRow {
  id: string;
  participant_id: string;
  event_id: string | null;
  ticket_number: string;
  status: TicketStatus;
  issued_at: string;
  issued_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentVerificationRecordRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  school_id: string | null;
  external_identifier: string | null;
  source: string;
  status: VerificationRecordStatus;
  matched_participant_id: string | null;
  matched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CheckinRow {
  id: string;
  ticket_id: string;
  participant_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
  method: string;
  metadata: Record<string, unknown>;
}

/** Vue enrichie d'un paiement avec les infos participant (jointure UI admin). */
export interface PaymentWithParticipant extends PaymentRow {
  participant: Pick<
    ParticipantRow,
    'first_name' | 'last_name' | 'email' | 'participant_type'
  > | null;
}

/** Ligne d'attribution de rôle (RBAC). Un utilisateur peut avoir plusieurs rôles. */
export interface UserRoleRow {
  user_id: string;
  role: Role;
  created_at: string;
}

/** Champs autorisés à l'insertion publique d'un participant (voir RLS). */
export type ParticipantInsert = Pick<
  ParticipantRow,
  | 'event_id'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'participant_type'
  | 'school_id'
>;
