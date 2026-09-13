/**
 * EventService — accès à l'événement actif.
 *
 * Stratégie de repli : si Supabase n'est pas configuré ou qu'aucun événement
 * publié n'existe encore, on retombe sur la configuration de repli
 * (event.config.ts) afin que la landing page reste utilisable. Les données de
 * repli sont explicitement marquées comme placeholders.
 */

import { supabase } from '@/lib/supabase';
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
