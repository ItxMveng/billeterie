/**
 * Machine à états du paiement — PURE et testée.
 *
 * SOURCE DE VÉRITÉ UNIQUE des transitions autorisées. Reflétée côté serveur
 * dans les fonctions SQL sécurisées (voir migrations S2). Interdit les
 * transitions incohérentes (ex. REJECTED → PAID).
 *
 * ⚠️ Le montant réellement dû est déterminé côté serveur. `getDisplayAmountCents`
 * ne sert qu'à l'affichage indicatif.
 */

import { PaymentStatus } from '@/types/enums';
import { getPaymentRequirement } from '@/features/participants/participant.logic';
import type { ParticipantType } from '@/types/enums';
import type { ResolvedEvent } from '@/features/events/EventService';

/**
 * Transitions autorisées pour le statut d'un paiement (ligne `payments`).
 * NOT_REQUIRED n'est pas un statut de transaction : il concerne le participant.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.NOT_REQUIRED]: [],
  [PaymentStatus.PENDING]: [
    PaymentStatus.AWAITING_CONFIRMATION,
    PaymentStatus.PAID, // confirmation directe possible par un admin
    PaymentStatus.REJECTED,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.AWAITING_CONFIRMATION]: [
    PaymentStatus.PAID,
    PaymentStatus.REJECTED,
    PaymentStatus.PENDING, // retour si la déclaration est invalidée
  ],
  [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING],
  [PaymentStatus.REJECTED]: [PaymentStatus.PENDING],
  [PaymentStatus.REFUNDED]: [],
};

/** Une transition de statut de paiement est-elle autorisée ? */
export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) return true; // idempotence : re-appliquer le même statut
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Lève une erreur si la transition est interdite (garde métier). */
export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Transition de paiement interdite : ${from} → ${to}`);
  }
}

/** Statut terminal (aucune transition sortante hors idempotence). */
export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return (PAYMENT_TRANSITIONS[status]?.length ?? 0) === 0;
}

/**
 * Montant indicatif à afficher (centimes), fondé sur la catégorie et les prix
 * de l'événement. NON fiable : le montant facturé est recalculé côté serveur.
 */
export function getDisplayAmountCents(
  type: ParticipantType,
  event: Pick<ResolvedEvent, 'alumniPriceCents' | 'otherPriceCents'>,
): number {
  if (!getPaymentRequirement({ participant_type: type })) return 0;
  return type === 'ALUMNI' ? event.alumniPriceCents : event.otherPriceCents;
}
