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
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-fiber-border bg-fiber-card/50 px-6 py-12 text-center shadow-card-glow">
          <SearchX className="h-10 w-10 text-fiber-teal/60" aria-hidden="true" />
          <div>
            <p className="font-mono text-base font-bold uppercase tracking-wide text-slate-100">
              Sin resultados
            </p>
            <p className="mt-1 text-sm text-slate-400">
              No encontramos equipos para “{query}”
              {selectedBrand !== ALL_BRANDS ? ` en ${selectedBrand}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-1 min-h-[44px] rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-sm font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-fiber-dark"
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
