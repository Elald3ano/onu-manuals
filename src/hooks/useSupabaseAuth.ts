import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase'

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email o contraseña incorrectos.'
  if (/email not confirmed/i.test(message)) {
    return 'El correo del administrador no está confirmado en Supabase.'
  }
  if (/failed to fetch|network|fetch/i.test(message)) {
    return 'No se pudo conectar con Supabase. Revisa tu conexión.'
  }
  return message
}

/**
 * Sesión de Supabase Auth para el panel de administración.
 * RLS exige un usuario autenticado para escribir en `onus` y en Storage.
 */
export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const client = requireSupabase()
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateAuthError(error.message))
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }, [])

  return { session, loading, signIn, signOut, isConfigured: isSupabaseConfigured }
}
