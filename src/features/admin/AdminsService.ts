/**
 * AdminsService — gestion des utilisateurs administratifs et des rôles.
 * Toute modification de rôle est réservée au SUPER_ADMIN (RPC sécurisée +
 * audit). Un ADMIN ne peut pas s'attribuer SUPER_ADMIN (garde côté serveur).
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { Role } from '@/types/enums';

export interface AdminUser {
  user_id: string;
  email: string;
  roles: Role[];
}

async function rpc<T = unknown>(name: string, args: Record<string, unknown>, scope: string): Promise<T> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const appError = toAppError(error);
    logger.reportError(appError, { scope });
    throw appError;
  }
  return data as T;
}

export const AdminsService = {
  async list(): Promise<AdminUser[]> {
    return rpc<AdminUser[]>('list_admin_users', {}, 'AdminsService.list');
  },
  async grantByEmail(email: string, role: Role): Promise<void> {
    await rpc('grant_role_by_email', { p_email: email, p_role: role }, 'AdminsService.grantByEmail');
  },
  async revoke(userId: string, role: Role): Promise<void> {
    await rpc('revoke_role', { p_user_id: userId, p_role: role }, 'AdminsService.revoke');
  },
};
