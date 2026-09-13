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

/**
 * Statut de paiement.
 * - NOT_REQUIRED : participation gratuite / exemptée (au niveau participant).
 * - PENDING : référence créée, en attente de l'action de l'utilisateur.
 * - AWAITING_CONFIRMATION : l'utilisateur déclare avoir payé (Wero) ; en
 *   attente de confirmation administrative. N'est JAMAIS une preuve de paiement.
 * - PAID : paiement confirmé par un administrateur (ou import déjà payé).
 * - FAILED / REJECTED : échec ou rejet par l'administration.
 * - REFUNDED : remboursé (usage ultérieur).
 */
export const PaymentStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Fournisseur / origine d'un paiement. */
export const PaymentProvider = {
  WERO: 'WERO',
  IMPORT: 'IMPORT',
  EXEMPTION: 'EXEMPTION',
} as const;
export type PaymentProvider =
  (typeof PaymentProvider)[keyof typeof PaymentProvider];

/**
 * Statut d'un enregistrement de la liste officielle de vérification.
 * - AVAILABLE : disponible pour matching.
 * - MATCHED : rattaché à un participant vérifié.
 * - ARCHIVED : retiré (ne participe plus au matching).
 */
export const VerificationRecordStatus = {
  AVAILABLE: 'AVAILABLE',
  MATCHED: 'MATCHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type VerificationRecordStatus =
  (typeof VerificationRecordStatus)[keyof typeof VerificationRecordStatus];

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

/**
 * Actions administratives sensibles enregistrées dans `audit_logs`.
 * Valeurs alignées avec les fonctions SQL sécurisées (voir migrations S2).
 */
export const AuditAction = {
  VERIFY_STUDENT: 'VERIFY_STUDENT',
  REJECT_STUDENT: 'REJECT_STUDENT',
  CONFIRM_PAYMENT: 'CONFIRM_PAYMENT',
  REJECT_PAYMENT: 'REJECT_PAYMENT',
  WAIVE_PAYMENT: 'WAIVE_PAYMENT',
  IMPORT_PARTICIPANTS: 'IMPORT_PARTICIPANTS',
  IMPORT_VERIFICATION_RECORDS: 'IMPORT_VERIFICATION_RECORDS',
  GENERATE_TICKET: 'GENERATE_TICKET',
  CANCEL_TICKET: 'CANCEL_TICKET',
  CHECK_IN: 'CHECK_IN',
  GRANT_ROLE: 'GRANT_ROLE',
  REVOKE_ROLE: 'REVOKE_ROLE',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

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
  PENDING: 'En attente de paiement',
  AWAITING_CONFIRMATION: 'À confirmer',
  PAID: 'Payé',
  FAILED: 'Échoué',
  REJECTED: 'Rejeté',
  REFUNDED: 'Remboursé',
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
