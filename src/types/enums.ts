/**
 * Enums métier — source de vérité unique pour les états du domaine.
 *
 * Ces valeurs sont volontairement explicites (chaînes en MAJUSCULES) afin
 * d'être lisibles en base de données comme dans le code, et de correspondre
 * aux types PostgreSQL (voir `supabase/migrations`).
 *
 * IMPORTANT : catégorie, vérification, paiement, inscription, billet et
 * check-in sont des dimensions INDÉPENDANTES. Ne jamais les fusionner.
 * (Voir BUSINESS_RULES.md)
 */

/** Catégorie principale du participant. Il n'existe que trois valeurs. */
export const ParticipantType = {
  NEW_STUDENT: 'NEW_STUDENT',
  ALUMNI: 'ALUMNI',
  OTHER: 'OTHER',
} as const;
export type ParticipantType =
  (typeof ParticipantType)[keyof typeof ParticipantType];

/**
 * Statut de vérification du statut déclaré.
 * NOT_REQUIRED : la catégorie ne nécessite aucune vérification (ALUMNI/OTHER).
 * PENDING/VERIFIED/REJECTED : parcours de vérification d'un NEW_STUDENT.
 */
export const VerificationStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** Statut de paiement. NOT_REQUIRED pour les participations gratuites. */
export const PaymentStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
} as const;
export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Statut global de l'inscription (workflow administratif). */
export const RegistrationStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
} as const;
export type RegistrationStatus =
  (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

/** Statut du billet (généré au Sprint 2). */
export const TicketStatus = {
  NOT_GENERATED: 'NOT_GENERATED',
  GENERATED: 'GENERATED',
  CANCELLED: 'CANCELLED',
} as const;
export type TicketStatus =
  (typeof TicketStatus)[keyof typeof TicketStatus];

/** Statut d'un événement. */
export const EventStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

/**
 * Rôles RBAC. L'ordre traduit une hiérarchie de privilèges décroissante,
 * mais l'autorisation réelle repose sur des permissions explicites
 * (voir features/auth/rbac.ts) et sur la RLS côté base.
 */
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FINANCE: 'FINANCE',
  CHECKIN: 'CHECKIN',
  VIEWER: 'VIEWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Libellés lisibles (FR) pour l'affichage. Séparés des valeurs métier. */
export const PARTICIPANT_TYPE_LABELS: Record<ParticipantType, string> = {
  NEW_STUDENT: 'Nouveau étudiant',
  ALUMNI: 'Ancien étudiant',
  OTHER: 'Autre / Invité',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  NOT_REQUIRED: 'Non requise',
  PENDING: 'En attente',
  VERIFIED: 'Vérifié',
  REJECTED: 'Rejeté',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NOT_REQUIRED: 'Non requis',
  PENDING: 'En attente',
  PAID: 'Payé',
  FAILED: 'Échoué',
  REJECTED: 'Rejeté',
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  REJECTED: 'Rejetée',
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  FINANCE: 'Finance',
  CHECKIN: 'Contrôle / Check-in',
  VIEWER: 'Lecture seule',
};
