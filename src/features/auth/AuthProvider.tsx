import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { Role } from '@/types/enums';
import { hasPermission, type Permission } from './rbac';
import { AuthContext, type AuthContextValue } from './auth-context';

/** Récupère les rôles de l'utilisateur depuis la table `user_roles`. */
async function fetchRoles(userId: string): Promise<Role[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (error) throw error;
    const valid = new Set<string>(Object.values(Role));
    return (data ?? [])
      .map((r) => r.role as string)
      .filter((r): r is Role => valid.has(r));
  } catch (e) {
    logger.reportError(toAppError(e), { scope: 'AuthProvider.fetchRoles' });
    return [];
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    const applySession = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setRoles(nextSession?.user ? await fetchRoles(nextSession.user.id) : []);
      if (active) setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch((e) => {
        logger.reportError(toAppError(e), { scope: 'AuthProvider.getSession' });
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw toAppError({ status: 0, message: 'Supabase non configuré.' });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const appError = toAppError({ status: error.status ?? 401, message: error.message });
      logger.reportError(appError, { scope: 'AuthProvider.signIn' });
      throw appError;
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) {
      throw toAppError({ status: 0, message: 'Supabase non configuré.' });
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const appError = toAppError({ status: error.status ?? 400, message: error.message });
      logger.reportError(appError, { scope: 'AuthProvider.updatePassword' });
      throw appError;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRoles([]);
  }, []);

  const can = useCallback(
    (permission: Permission) => hasPermission(roles, permission),
    [roles],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      roles,
      isAuthenticated: Boolean(session),
      configured: isSupabaseConfigured,
      can,
      signIn,
      signOut,
      updatePassword,
    }),
    [loading, session, user, roles, can, signIn, signOut, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
