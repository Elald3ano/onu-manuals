import { useMemo, useState } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import type { ONU } from '../types/onu'

export const ALL_BRANDS = 'Todas'

const FUSE_OPTIONS: IFuseOptions<ONU> = {
  keys: [
    { name: 'brand', weight: 0.4 },
    { name: 'model', weight: 0.3 },
    { name: 'aliases', weight: 0.2 },
    { name: 'credentials.username', weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 1,
  shouldSort: true,
}

/**
 * Búsqueda difusa (Fuse.js) + filtrado por marca sobre el catálogo de ONUs.
 */
export function useOnuSearch(onus: ONU[]) {
  const [query, setQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>(ALL_BRANDS)

  const fuse = useMemo(() => new Fuse(onus, FUSE_OPTIONS), [onus])

  const brands = useMemo(() => {
    const unique = Array.from(new Set(onus.map((onu) => onu.brand)))
    unique.sort((a, b) => a.localeCompare(b, 'es'))
    return [ALL_BRANDS, ...unique]
  }, [onus])

  const filteredOnus = useMemo(() => {
    const trimmed = query.trim()
    const matchesBrand = (onu: ONU) =>
      selectedBrand === ALL_BRANDS || onu.brand === selectedBrand

    if (!trimmed) {
      return onus.filter(matchesBrand)
    }

    return fuse
      .search(trimmed)
      .map((result) => result.item)
      .filter(matchesBrand)
  }, [onus, query, selectedBrand, fuse])

  return {
    query,
    setQuery,
    selectedBrand,
    setSelectedBrand,
    filteredOnus,
    totalCount: onus.length,
    brands,
  }
}
