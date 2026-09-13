/**
 * AuditService — consultation du journal d'audit (ADMIN/SUPER_ADMIN via RLS).
 * Filtrage côté serveur ; ne charge jamais toute la table.
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { AuditLogRow } from '@/types/database';

export interface AuditFilters {
  action?: string;
  entityType?: string;
  limit?: number;
}

export const AuditService = {
  async list(filters: AuditFilters = {}): Promise<AuditLogRow[]> {
    const supabase = requireSupabase();
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.entityType) query = query.eq('entity_type', filters.entityType);

    const { data, error } = await query;
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'AuditService.list' });
      throw appError;
    }
    return (data ?? []) as AuditLogRow[];
  },
};
