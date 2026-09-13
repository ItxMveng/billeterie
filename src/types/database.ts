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
  RegistrationStatus,
  Role,
  TicketStatus,
  VerificationStatus,
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
  registration_status: RegistrationStatus;
  ticket_status: TicketStatus;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
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
