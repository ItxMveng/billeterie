/**
 * StatsService — statistiques agrégées côté serveur (scalable).
 * Les comptes proviennent de RPC (agrégation SQL), pas d'un chargement massif
 * de lignes dans le navigateur.
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface EventStats {
  participants_total: number;
  new_students: number;
  alumni: number;
  others: number;
  /** Absent tant que deploy/step17 n'est pas appliqué. */
  cpba_guests?: number;
  verification_pending: number;
  payment_pending: number;
  payment_awaiting: number;
  payment_paid: number;
  tickets_generated: number;
  tickets_not_generated: number;
  checked_in: number;
  not_checked_in: number;
  payment_breakdown: Record<string, number>;
  by_school: Array<{ school: string; count: number }>;
}

/** Invités CPBA (déduits du total si la base ne les compte pas encore). */
export function cpbaGuests(s: EventStats): number {
  return s.cpba_guests ?? Math.max(0, s.participants_total - s.new_students - s.alumni - s.others);
}

export interface TimeSeries {
  registrations: Array<{ day: string; count: number }>;
  checkins: Array<{ day: string; count: number }>;
}

export const StatsService = {
  async getOverview(eventId: string | null): Promise<EventStats> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('get_event_stats', { p_event_id: eventId });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'StatsService.getOverview' });
      throw appError;
    }
    return data as EventStats;
  },

  async getTimeSeries(eventId: string | null, days = 30): Promise<TimeSeries> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('get_time_series', {
      p_days: days,
      p_event_id: eventId,
    });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'StatsService.getTimeSeries' });
      throw appError;
    }
    return data as TimeSeries;
  },
};
