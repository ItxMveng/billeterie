/**
 * ParticipantService — accès aux données des participants.
 *
 * Seule couche autorisée à parler à Supabase pour ce domaine. Les composants
 * UI n'appellent jamais Supabase directement.
 *
 * Sécurité :
 * - L'insertion publique ne fournit QUE les champs de contact + catégorie +
 *   école. Les statuts (vérification/paiement/inscription/billet) sont dérivés
 *   et posés par un trigger en base : le client ne peut pas les falsifier.
 * - La lecture de la liste des participants est réservée aux admins par la RLS.
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ParticipantRow } from '@/types/database';
import type { RegistrationValues } from '@/schemas/participant.schema';

export const ParticipantService = {
  /**
   * Crée une inscription publique. Retourne l'identifiant créé.
   * Les doublons (même email + même catégorie + même événement) sont
   * rejetés par une contrainte d'unicité et remontés comme conflit.
   */
  async createRegistration(
    values: RegistrationValues,
    eventId: string | null,
  ): Promise<{ id: string }> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('participants')
      .insert({
        event_id: eventId,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
        participant_type: values.participant_type,
        school_id: values.school_id ?? null,
      })
      .select('id')
      .single();

    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'ParticipantService.createRegistration' });
      throw appError;
    }
    return { id: data.id as string };
  },

  /** Liste des participants (admin uniquement — protégé par la RLS). */
  async list(): Promise<ParticipantRow[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'ParticipantService.list' });
      throw appError;
    }
    return (data ?? []) as ParticipantRow[];
  },
};
