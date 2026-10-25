import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

export type OnuSupabaseClient = SupabaseClient<Database>

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** Lee el claim `role` de un JWT (anon / service_role) sin validar la firma. */
function readJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    )
    const parsed: unknown = JSON.parse(atob(padded))

    if (parsed && typeof parsed === 'object' && 'role' in parsed) {
      const role = (parsed as { role?: unknown }).role
      return typeof role === 'string' ? role : null
    }
  } catch {
    // Claves nuevas (sb_publishable_…) no son JWT: no hay rol que leer.
  }
  return null
}

const anonKeyRole = readJwtRole(supabaseAnonKey)
const hasServiceRoleKey = anonKeyRole === 'service_role'
const hasValidUrl = /^https?:\/\/.+/i.test(supabaseUrl)

if (hasServiceRoleKey) {
  console.error(
    'Supabase: la clave configurada tiene rol service_role. Se desactiva el cliente para no ' +
      'exponerla en el bundle. Usa la clave anon o publishable.',
  )
}

/**
 * Indica si las variables de entorno de Supabase están presentes y son seguras.
 * Permite degradar con elegancia si falta configuración (p. ej. en un deploy
 * de GitHub Pages sin variables definidas) o si se detecta una service_role.
 */
export const isSupabaseConfigured =
  hasValidUrl && supabaseAnonKey !== '' && !hasServiceRoleKey

/**
 * Cliente de Supabase tipado con el esquema `public.onus`.
 * Solo usa la clave `anon`; la escritura queda protegida por RLS + Auth.
 * Es `null` cuando faltan las variables de entorno.
 */
export const supabase: OnuSupabaseClient | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/**
 * Devuelve el cliente o lanza un error explicativo si falta configuración.
 * Úsalo en los módulos que requieran Supabase de forma obligatoria.
 */
export function requireSupabase(): OnuSupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno de build.',
    )
  }
  return supabase
}
