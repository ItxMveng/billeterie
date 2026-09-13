/**
 * Client Supabase — point d'accès unique et bas-niveau à la base.
 *
 * Règles :
 * - Seule la clé anon (publique) est utilisée côté client. La clé
 *   service_role ne doit JAMAIS apparaître dans le frontend.
 * - Aucune requête métier n'est écrite ici : la logique d'accès aux données
 *   vit dans les `*Service` de chaque feature. Ce module ne fait qu'exposer
 *   le client (ou `null` s'il n'est pas configuré).
 * - Toute la sécurité repose sur la Row Level Security (voir SECURITY.md) :
 *   la clé anon ne donne accès qu'à ce que les policies autorisent.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { AppError } from './errors';

const client: SupabaseClient | null = env.supabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Le client Supabase, ou `null` si l'environnement n'est pas configuré. */
export const supabase = client;

/**
 * Renvoie le client Supabase ou lève une `AppError(CONFIG)` explicite.
 * À utiliser dans les services quand une connexion est indispensable.
 */
export function requireSupabase(): SupabaseClient {
  if (!client) {
    throw new AppError('CONFIG', {
      technicalMessage:
        'Supabase non configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants).',
    });
  }
  return client;
}

export const isSupabaseConfigured = env.supabaseConfigured;
