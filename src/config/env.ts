/**
 * Accès centralisé et validé aux variables d'environnement (Vite).
 *
 * - Aucune variable d'environnement ne doit être lue directement ailleurs
 *   dans l'application : tout passe par ce module.
 * - Les valeurs sont validées au démarrage ; une configuration invalide
 *   échoue tôt et de manière lisible.
 * - Seules les clés `VITE_*` sont exposées au client (contrat Vite).
 */

interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** true seulement si l'URL et la clé Supabase sont réellement présentes. */
  supabaseConfigured: boolean;
}

function readString(key: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return typeof value === 'string' ? value.trim() : '';
}

const supabaseUrl = readString('VITE_SUPABASE_URL');
const supabaseAnonKey = readString('VITE_SUPABASE_ANON_KEY');

const isPlaceholder = (value: string): boolean =>
  value === '' ||
  value.includes('your-project-ref') ||
  value.includes('your-anon-public-key');

const supabaseConfigured =
  !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const env: AppEnv = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseConfigured,
};

/**
 * En développement, on avertit clairement si Supabase n'est pas configuré,
 * sans faire planter l'app : la landing page et le design restent utilisables.
 */
if (import.meta.env.DEV && !supabaseConfigured) {
  console.warn(
    '[config] Supabase non configuré : copiez .env.example vers .env.local ' +
      'et renseignez VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      "L'inscription et l'authentification seront désactivées jusque-là.",
  );
}
