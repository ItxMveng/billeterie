/**
 * Logique métier des participants — PURE, sans dépendance UI ni réseau.
 *
 * C'est la source de vérité réutilisable des règles métier. Elle est :
 * - testée unitairement (participant.logic.test.ts) ;
 * - réutilisable côté serveur (Edge Function) au Sprint 2 ;
 * - JAMAIS l'unique garde-fou : la base applique aussi ses contraintes et la
 *   RLS (voir SECURITY.md / DATABASE.md). Le frontend n'est pas une preuve.
 *
 * Voir BUSINESS_RULES.md pour la justification de chaque règle.
 */

import {
  ParticipantType,
  PaymentStatus,
  RegistrationStatus,
  TicketStatus,
  VerificationStatus,
} from '@/types/enums';

/** Vue minimale d'un participant suffisante pour les décisions métier. */
export interface ParticipantLike {
  participant_type: ParticipantType;
  verification_status?: VerificationStatus;
  payment_status?: PaymentStatus;
  registration_status?: RegistrationStatus;
}

/**
 * Le paiement est-il requis pour cette catégorie ?
 *
 * - NEW_STUDENT : participation gratuite → false.
 * - ALUMNI      : payant → true.
 * - OTHER       : payant → true.
 *
 * Décision fondée sur la CATÉGORIE (propriété structurelle), pas sur une
 * donnée manipulable côté client. La vérification d'un nouveau conditionne
 * l'émission du BILLET, pas le fait de payer (voir canIssueTicket).
 */
export function getPaymentRequirement(participant: ParticipantLike): boolean {
  switch (participant.participant_type) {
    case ParticipantType.NEW_STUDENT:
      return false;
    case ParticipantType.ALUMNI:
    case ParticipantType.OTHER:
      return true;
    default:
      // Défaut sûr : en cas de type inattendu, on exige le paiement.
      return true;
  }
}

/** La catégorie nécessite-t-elle une vérification de statut ? (NEW_STUDENT) */
export function requiresVerification(type: ParticipantType): boolean {
  return type === ParticipantType.NEW_STUDENT;
}

/**
 * Une ancienne école est-elle obligatoire ?
 * - ALUMNI : oui.
 * - NEW_STUDENT / OTHER : non.
 */
export function requiresSchool(type: ParticipantType): boolean {
  return type === ParticipantType.ALUMNI;
}

/**
 * Le participant est-il un NOUVEAU réellement VÉRIFIÉ ?
 * Un statut simplement DÉCLARÉ (PENDING) n'est jamais une preuve.
 */
export function isVerifiedNewStudent(participant: ParticipantLike): boolean {
  return (
    participant.participant_type === ParticipantType.NEW_STUDENT &&
    participant.verification_status === VerificationStatus.VERIFIED
  );
}

/** Statut de vérification initial cohérent avec la catégorie. */
export function getInitialVerificationStatus(
  type: ParticipantType,
): VerificationStatus {
  return requiresVerification(type)
    ? VerificationStatus.PENDING
    : VerificationStatus.NOT_REQUIRED;
}

/** Statut de paiement initial cohérent avec la catégorie. */
export function getInitialPaymentStatus(type: ParticipantType): PaymentStatus {
  return getPaymentRequirement({ participant_type: type })
    ? PaymentStatus.PENDING
    : PaymentStatus.NOT_REQUIRED;
}

/**
 * États initiaux dérivés à la création d'une inscription.
 * Ces valeurs sont AUSSI appliquées par un trigger en base (défense en
 * profondeur) : le client ne peut pas les falsifier via la RLS.
 */
export function deriveInitialStatuses(type: ParticipantType): {
  verification_status: VerificationStatus;
  payment_status: PaymentStatus;
  registration_status: RegistrationStatus;
  ticket_status: TicketStatus;
} {
  return {
    verification_status: getInitialVerificationStatus(type),
    payment_status: getInitialPaymentStatus(type),
    registration_status: RegistrationStatus.PENDING,
    ticket_status: TicketStatus.NOT_GENERATED,
  };
}

/**
 * Un billet peut-il être émis pour ce participant ?
 *
 * Conditions (Sprint 1 — règles préparées, l'émission réelle vient au S2) :
 * - inscription confirmée ;
 * - NEW_STUDENT : vérification VERIFIED ;
 * - ALUMNI / OTHER : paiement PAID.
 */
export function canIssueTicket(participant: ParticipantLike): boolean {
  if (participant.registration_status !== RegistrationStatus.CONFIRMED) {
    return false;
  }
  if (participant.participant_type === ParticipantType.NEW_STUDENT) {
    return isVerifiedNewStudent(participant);
  }
  return participant.payment_status === PaymentStatus.PAID;
}
