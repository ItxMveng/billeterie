/**
 * CheckinService — FRONTIÈRE du module de scan / check-in à l'entrée.
 *
 * ⚠️ Sprint 1 : scanner et check-in NON implémentés (Sprint 3). Le mode hors
 * ligne du scanner n'est pas prétendu fonctionnel. Contrat posé ici.
 */

import { AppError } from '@/lib/errors';

export const CheckinService = {
  /** Sprint 3 : valide un billet scanné et marque le check-in. */
  async checkIn(): Promise<never> {
    throw new AppError('CONFIG', {
      userMessage: 'Le contrôle à l\'entrée sera disponible prochainement.',
      technicalMessage: 'CheckinService.checkIn non implémenté (Sprint 3).',
    });
  },
};
