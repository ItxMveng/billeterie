/**
 * PaymentService — FRONTIÈRE du module de paiement (Wero).
 *
 * ⚠️ Sprint 1 : le paiement réel N'EST PAS implémenté. Ce service définit le
 * contrat pour que le Sprint 2 branche Wero sans réécrire le frontend.
 *
 * Règle de sécurité : le montant dû n'est JAMAIS fiable depuis le client.
 * `getDisplayAmountCents` sert uniquement à l'affichage indicatif ; le montant
 * réellement facturé sera calculé et vérifié côté serveur (Edge Function).
 */

import { AppError } from '@/lib/errors';
import { getPaymentRequirement } from '@/features/participants/participant.logic';
import type { ParticipantType } from '@/types/enums';
import type { ResolvedEvent } from '@/features/events/EventService';

export const PaymentService = {
  /**
   * Montant indicatif à afficher (centimes), fondé sur la catégorie et les
   * prix de l'événement. NON fiable : à re-vérifier côté serveur.
   */
  getDisplayAmountCents(type: ParticipantType, event: ResolvedEvent): number {
    if (!getPaymentRequirement({ participant_type: type })) return 0;
    return type === 'ALUMNI'
      ? event.alumniPriceCents
      : event.otherPriceCents;
  },

  /** Sprint 2 : initier un paiement Wero. Non disponible au Sprint 1. */
  async initiatePayment(): Promise<never> {
    throw new AppError('CONFIG', {
      userMessage:
        'Le paiement en ligne sera disponible prochainement.',
      technicalMessage: 'PaymentService.initiatePayment non implémenté (Sprint 2).',
    });
  },
};
