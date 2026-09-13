/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_EVENT_NAME: string;
  readonly VITE_EVENT_DATE: string;
  readonly VITE_EVENT_LOCATION: string;
  readonly VITE_ALUMNI_PRICE_CENTS: string;
  readonly VITE_OTHER_PRICE_CENTS: string;
  readonly VITE_CURRENCY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
