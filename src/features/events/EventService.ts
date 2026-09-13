/**
 * EventService — accès à l'événement actif.
 *
 * Stratégie de repli : si Supabase n'est pas configuré ou qu'aucun événement
 * publié n'existe encore, on retombe sur la configuration de repli
 * (event.config.ts) afin que la landing page reste utilisable. Les données de
 * repli sont explicitement marquées comme placeholders.
 */

import { supabase, requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { eventConfig } from '@/config/event.config';
import { EventStatus } from '@/types/enums';
import type { EventRow } from '@/types/database';

/** Représentation d'événement consommée par l'UI (base OU repli). */
export interface ResolvedEvent {
  id: string | null;
  name: string;
  description: string | null;
  date: string;
  location: string | null;
  currency: string;
  alumniPriceCents: number;
  otherPriceCents: number;
  /** true si issu de la configuration de repli (non confirmé en base). */
  isPlaceholder: boolean;
}

function fromConfig(): ResolvedEvent {
  return {
    id: null,
    name: eventConfig.name,
    description: null,
    date: eventConfig.date,
    location: eventConfig.location,
    currency: eventConfig.currency,
    alumniPriceCents: eventConfig.alumniPriceCents,
    otherPriceCents: eventConfig.otherPriceCents,
    isPlaceholder: true,
  };
}

function fromRow(row: EventRow): ResolvedEvent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    date: row.date,
    location: row.location,
    currency: row.currency,
    alumniPriceCents: row.alumni_price_cents,
    otherPriceCents: row.other_price_cents,
    isPlaceholder: false,
  };
}

export const EventService = {
  /** Tous les événements (staff — policy `events_staff_read`). */
  async listAll(): Promise<EventRow[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'EventService.listAll' });
      throw appError;
    }
    return (data ?? []) as EventRow[];
  },

  /**
   * Crée un événement (ADMIN/SUPER_ADMIN — policy `events_admin_write`).
   * Les prix sont en CENTIMES (25 € → 2500).
   */
  async create(input: {
    name: string;
    date: string;
    location?: string | null;
    alumni_price_cents: number;
    other_price_cents: number;
    currency?: string;
    status?: EventRow['status'];
  }): Promise<EventRow> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('events')
      .insert({
        name: input.name.trim(),
        date: input.date,
        location: input.location?.trim() || null,
        alumni_price_cents: input.alumni_price_cents,
        other_price_cents: input.other_price_cents,
        currency: input.currency ?? 'EUR',
        status: input.status ?? 'PUBLISHED',
      })
      .select('*')
      .single();
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'EventService.create' });
      throw appError;
    }
    return data as EventRow;
  },

  /** Met à jour un événement (nom, date, lieu, prix, statut). */
  async update(
    id: string,
    patch: Partial<
      Pick<
        EventRow,
        | 'name'
        | 'description'
        | 'date'
        | 'location'
        | 'alumni_price_cents'
        | 'other_price_cents'
        | 'currency'
        | 'status'
      >
    >,
  ): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from('events').update(patch).eq('id', id);
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'EventService.update' });
      throw appError;
    }
  },

  /**
   * Renvoie l'événement actif. Ne lève jamais : en cas d'erreur ou d'absence,
   * retombe sur la configuration de repli pour préserver l'affichage public.
   */
  async getActiveEvent(): Promise<ResolvedEvent> {
    if (!supabase) return fromConfig();

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', EventStatus.PUBLISHED)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? fromRow(data as EventRow) : fromConfig();
    } catch (e) {
      logger.reportError(toAppError(e), { scope: 'EventService.getActiveEvent' });
      return fromConfig();
    }
  },
};
