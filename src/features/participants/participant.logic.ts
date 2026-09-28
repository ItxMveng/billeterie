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
  /**
   * Exemption/obligation de paiement explicite (colonne DB au Sprint 2).
   * Si défini, prime sur la dérivation par catégorie (dirigeants, exemptions).
   * `participant_type` décrit le participant ; `payment_required` décrit son
   * obligation financière : les deux dimensions sont indépendantes.
   * `null`/`undefined` = non défini → dérivation par catégorie.
   */
  payment_required?: boolean | null;
}

/**
 * Le paiement est-il requis ?
 *
 * La décision repose sur le TARIF configuré pour l'événement, pas sur la
 * catégorie : un tarif à 0 signifie participation gratuite. Les tarifs étant
 * actuellement à 0, tout le monde participe gratuitement — et il suffit de
 * saisir un tarif dans « Événement » pour réactiver le paiement, sans
 * déploiement de code.
 *
 * Les nouveaux étudiants sont gratuits par construction (aucun tarif ne leur
 * est applicable). Le montant n'est jamais fiable côté client : il est
 * recalculé côté serveur à la création du paiement.
 */
export function getPaymentRequirement(
  participant: ParticipantLike,
  amountCents = 0,
): boolean {
  if (participant.participant_type === ParticipantType.NEW_STUDENT) return false;
  return amountCents > 0;
}

/**
 * Obligation de paiement EFFECTIVE d'un participant, exemptions comprises.
 *
 * Priorité : une exemption/obligation explicite (`payment_required`, posée par
 * un administrateur autorisé et auditée) prime sur la dérivation par catégorie.
 * Ainsi un dirigeant peut être `ALUMNI`/`OTHER` avec `payment_required = false`
 * sans créer de 4ᵉ catégorie. Voir BUSINESS_RULES.md.
 */
export function resolvePaymentRequired(participant: ParticipantLike): boolean {
  if (typeof participant.payment_required === 'boolean') {
    return participant.payment_required;
  }
  return getPaymentRequirement(participant);
}

/** La catégorie nécessite-t-elle une vérification de statut ? (NEW_STUDENT) */
export function requiresVerification(type: ParticipantType): boolean {
  return type === ParticipantType.NEW_STUDENT;
}

/**
 * Un établissement est-il obligatoire ?
 * - NEW_STUDENT : oui — l'école dans laquelle il étudie.
 * - ALUMNI      : oui — son ancienne école.
 * - OTHER       : non.
 */
export function requiresSchool(type: ParticipantType): boolean {
  return type === ParticipantType.NEW_STUDENT || type === ParticipantType.ALUMNI;
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
 * Conditions métier d'ÉLIGIBILITÉ à la génération d'un billet.
 *
 * SOURCE DE VÉRITÉ UNIQUE, reflétée côté serveur par la fonction SQL
 * `can_generate_ticket`. Le billet étant désormais émis dès l'inscription,
 * ces conditions sont volontairement minimales :
 *
 * - l'inscription ne doit pas être REJETÉE ;
 * - la vérification ne doit pas être explicitement REJETÉE — un statut
 *   PENDING ne bloque plus (la participation est gratuite, faire attendre une
 *   validation humaine n'apporte plus de garantie) ;
 * - si un paiement est réellement requis, il doit être encaissé (PAID).
 */
export function canGenerateTicket(participant: ParticipantLike): boolean {
  if (participant.registration_status === RegistrationStatus.REJECTED) {
    return false;
  }
  if (participant.verification_status === VerificationStatus.REJECTED) {
    return false;
  }
  if (resolvePaymentRequired(participant)) {
    return participant.payment_status === PaymentStatus.PAID;
  }
  return true;
}

/**
 * @deprecated Conservé pour compatibilité (tests Sprint 1). Exige en plus une
 * inscription CONFIRMED. Préférer `canGenerateTicket` (source de vérité S2).
 */
export function canIssueTicket(participant: ParticipantLike): boolean {
  if (participant.registration_status !== RegistrationStatus.CONFIRMED) {
    return false;
  }
  return canGenerateTicket(participant);
}
