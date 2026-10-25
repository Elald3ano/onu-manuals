/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** URL del proyecto Supabase, p. ej. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Clave pública (rol anon) del proyecto Supabase. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
