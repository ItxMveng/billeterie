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

  /**
   * Crée un établissement (ADMIN/SUPER_ADMIN — policy `schools_admin_write`).
   * Un utilisateur sans le rôle reçoit une erreur d'autorisation de la base.
   */
  async create(input: {
    name: string;
    short_name?: string | null;
    is_active?: boolean;
  }): Promise<SchoolRow> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('schools')
      .insert({
        name: input.name.trim(),
        short_name: input.short_name?.trim() || null,
        is_active: input.is_active ?? true,
      })
      .select('*')
      .single();
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'SchoolService.create' });
      throw appError;
    }
    return data as SchoolRow;
  },

  /** Met à jour un établissement (nom, sigle, activation). */
  async update(
    id: string,
    patch: Partial<Pick<SchoolRow, 'name' | 'short_name' | 'is_active'>>,
  ): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from('schools').update(patch).eq('id', id);
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'SchoolService.update' });
      throw appError;
    }
  },

  /**
   * Supprime un établissement. Refusé par le serveur s'il est référencé par
   * des participants (il faut alors le désactiver plutôt que le supprimer).
   */
  async remove(id: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.rpc('admin_delete_school', { p_school_id: id });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'SchoolService.remove' });
      throw appError;
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
