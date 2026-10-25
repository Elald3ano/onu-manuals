import { SearchX } from 'lucide-react'
import type { ONU } from '../types/onu'
import { ALL_BRANDS, useOnuSearch } from '../hooks/useOnuSearch'
import { SearchBar } from '../components/SearchBar'
import { OnuCard } from '../components/OnuCard'

interface CatalogViewProps {
  onus: ONU[]
  onOpenOnu: (id: string) => void
}

export function CatalogView({ onus, onOpenOnu }: CatalogViewProps) {
  const {
    query,
    setQuery,
    selectedBrand,
    setSelectedBrand,
    filteredOnus,
    totalCount,
    brands,
  } = useOnuSearch(onus)

  const clearFilters = () => {
    setQuery('')
    setSelectedBrand(ALL_BRANDS)
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        brands={brands}
        selectedBrand={selectedBrand}
        onBrandChange={setSelectedBrand}
        resultCount={filteredOnus.length}
        totalCount={totalCount}
      />

      {filteredOnus.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-800/50 px-6 py-12 text-center">
          <SearchX className="h-10 w-10 text-slate-500" aria-hidden="true" />
          <div>
            <p className="text-base font-bold text-slate-100">Sin resultados</p>
            <p className="mt-1 text-sm text-slate-400">
              No encontramos equipos para “{query}”
              {selectedBrand !== ALL_BRANDS ? ` en ${selectedBrand}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-1 min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition-colors hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOnus.map((onu) => (
            <OnuCard key={onu.id} onu={onu} onOpen={onOpenOnu} />
          ))}
        </div>
      )}
    </div>
  )
}
