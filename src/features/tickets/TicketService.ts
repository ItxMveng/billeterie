/**
 * TicketService — FRONTIÈRE du module de billetterie / QR codes.
 *
 * ⚠️ Sprint 1 : génération de billets et QR codes NON implémentée.
 * Le contrat est posé pour le Sprint 2. La condition d'éligibilité métier
 * (`canIssueTicket`) vit déjà dans participant.logic.ts.
 */

import { AppError } from '@/lib/errors';

export const TicketService = {
  /** Sprint 2 : génère le billet + QR code d'un participant éligible. */
  async generateTicket(): Promise<never> {
    throw new AppError('CONFIG', {
      userMessage: 'La génération des billets sera disponible prochainement.',
      technicalMessage: 'TicketService.generateTicket non implémenté (Sprint 2).',
    });
  },
};
