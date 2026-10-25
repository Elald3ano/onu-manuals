import { useCallback, useEffect, useRef, useState } from 'react'
import type { ONU } from '../types/onu'
import { INITIAL_ONUS } from '../data/onus'
import {
  fetchOnusWithSource,
  readOnuCache,
  sortOnus,
  writeOnuCache,
} from '../services/onuService'
import { supabase } from '../lib/supabase'

/**
 * Catálogo reactivo con estrategia offline-first:
 * - Arranca con la caché local (o el catálogo empaquetado) para pintar sin parpadeos.
 * - Sincroniza con Supabase en segundo plano.
 * - Se suscribe a Realtime para reflejar cambios de otros dispositivos.
 */
export function useOnusCatalog() {
  const [onus, setOnus] = useState<ONU[]>(() => readOnuCache() ?? INITIAL_ONUS)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const result = await fetchOnusWithSource()
      if (mountedRef.current) setOnus(result.onus)
    } finally {
      if (mountedRef.current && !options?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('onus-catalog-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'onus' },
        () => {
          void refresh({ silent: true })
        },
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [refresh])

  useEffect(() => {
    const handleOnline = () => {
      void refresh({ silent: true })
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [refresh])

  /** Actualización optimista tras guardar en el panel. */
  const applySaved = useCallback((saved: ONU) => {
    setOnus((previous) => {
      const exists = previous.some((item) => item.id === saved.id)
      const next = sortOnus(
        exists
          ? previous.map((item) => (item.id === saved.id ? saved : item))
          : [...previous, saved],
      )
      writeOnuCache(next)
      return next
    })
  }, [])

  return { onus, loading, refresh, applySaved }
}
