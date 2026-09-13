/**
 * SchoolService — accès aux écoles configurables.
 *
 * Les écoles actives sont lisibles publiquement (nécessaire au formulaire).
 * La création/modification est réservée aux admins (RLS).
 */

import { supabase, requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { SchoolRow } from '@/types/database';

export const SchoolService = {
  /** Liste des écoles actives (pour le formulaire public). */
  async listActive(): Promise<SchoolRow[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SchoolRow[];
    } catch (e) {
      logger.reportError(toAppError(e), { scope: 'SchoolService.listActive' });
      return [];
    }
  },

  /** Liste complète (admin — protégé par la RLS). */
  async listAll(): Promise<SchoolRow[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('schools')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'SchoolService.listAll' });
      throw appError;
    }
    return (data ?? []) as SchoolRow[];
  },
};
