import { Database, Loader2, SearchX } from 'lucide-react'
import type { ONU } from '../types/onu'
import { ALL_BRANDS, useOnuSearch } from '../hooks/useOnuSearch'
import { SearchBar } from '../components/SearchBar'
import { OnuCard } from '../components/OnuCard'

interface CatalogViewProps {
  onus: ONU[]
  loading?: boolean
  onOpenOnu: (id: string) => void
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow"
        >
          <div className="h-40 rounded-xl bg-fiber-dark/80" />
          <div className="mt-4 h-5 w-24 rounded bg-fiber-dark/80" />
          <div className="mt-2 h-7 w-40 rounded bg-fiber-dark/80" />
          <div className="mt-4 space-y-2">
            <div className="h-12 rounded-xl bg-fiber-dark/80" />
            <div className="h-12 rounded-xl bg-fiber-dark/80" />
            <div className="h-12 rounded-xl bg-fiber-dark/80" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyCatalog() {
  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-fiber-border bg-fiber-card/50 px-6 py-12 text-center shadow-card-glow">
      <Database className="h-10 w-10 text-fiber-teal/60" aria-hidden="true" />
      <div className="w-full min-w-0">
        <p className="font-mono text-base font-bold uppercase tracking-wide text-slate-100">
          Catálogo vacío
        </p>
        <p className="mt-1 w-full max-w-md break-words text-sm text-slate-400 sm:mx-auto">
          Supabase está conectado, pero la tabla <code className="font-mono text-fiber-cyan/90">onus</code>{' '}
          no tiene registros. Ejecuta <code className="font-mono text-fiber-cyan/90">npm run seed:supabase</code>{' '}
          o crea la primera ONU desde el panel.
        </p>
      </div>
      <a
        href="#/admin"
        className="mt-1 flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-sm font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-fiber-dark"
      >
        Abrir panel de administración
      </a>
    </div>
  )
}

export function CatalogView({ onus, loading = false, onOpenOnu }: CatalogViewProps) {
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

  const showSkeleton = loading && onus.length === 0
  const showEmpty = !loading && onus.length === 0
  const showNoResults = onus.length > 0 && filteredOnus.length === 0

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

      {loading && onus.length > 0 && (
        <div
          className="flex items-center gap-2 rounded-xl border border-fiber-border bg-fiber-card/60 px-3 py-2 font-mono text-xs font-medium text-slate-400"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-fiber-cyan" aria-hidden="true" />
          Actualizando catálogo desde Supabase…
        </div>
      )}

      {showSkeleton ? (
        <CatalogSkeleton />
      ) : showEmpty ? (
        <EmptyCatalog />
      ) : showNoResults ? (
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
