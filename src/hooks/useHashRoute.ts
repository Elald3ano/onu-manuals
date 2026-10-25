import { useCallback, useEffect, useState } from 'react'

export type RouteName = 'catalog' | 'detail' | 'admin'

export interface HashRouteState {
  route: RouteName
  params: { id?: string }
  query: Record<string, string>
}

function parseQuery(queryString: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!queryString) return result
  try {
    const search = new URLSearchParams(queryString)
    search.forEach((value, key) => {
      result[key] = value
    })
  } catch {
    // Query malformada: la ignoramos.
  }
  return result
}

function parseHash(hash: string): HashRouteState {
  // "#/admin?edit=vsol" -> "admin?edit=vsol"
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart, queryPart = ''] = raw.split('?')
  const query = parseQuery(queryPart)
  const [segment, param] = pathPart.split('/').filter(Boolean)

  if (segment === 'onu' && param) {
    return { route: 'detail', params: { id: decodeURIComponent(param) }, query }
  }

  if (segment === 'admin') {
    return { route: 'admin', params: {}, query }
  }

  return { route: 'catalog', params: {}, query }
}

/**
 * Enrutamiento ligero basado en hash (#/ y #/onu/:id), sin dependencias externas.
 * Soporta query params (ej: #/admin?edit=vsol).
 */
export function useHashRoute() {
  const [state, setState] = useState<HashRouteState>(() => parseHash(window.location.hash))

  useEffect(() => {
    const handleHashChange = () => setState(parseHash(window.location.hash))
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((to: string) => {
    const normalized = to.startsWith('#') ? to : `#${to.startsWith('/') ? '' : '/'}${to}`

    if (window.location.hash === normalized) {
      setState(parseHash(normalized))
      return
    }

    window.location.hash = normalized
  }, [])

  return { ...state, navigate }
}
