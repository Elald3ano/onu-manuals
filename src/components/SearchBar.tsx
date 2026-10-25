import { Search, X } from 'lucide-react'

interface SearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  brands: string[]
  selectedBrand: string
  onBrandChange: (brand: string) => void
  resultCount: number
  totalCount: number
}

export function SearchBar({
  query,
  onQueryChange,
  brands,
  selectedBrand,
  onBrandChange,
  resultCount,
  totalCount,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Input de búsqueda */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar marca, modelo o alias…"
          aria-label="Buscar equipos ONU"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-800 pl-12 pr-12 text-base font-medium text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 [&::-webkit-search-cancel-button]:hidden"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Chips de marca con scroll horizontal suave */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {brands.map((brand) => {
            const isActive = brand === selectedBrand
            return (
              <button
                key={brand}
                type="button"
                onClick={() => onBrandChange(brand)}
                aria-pressed={isActive}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                  isActive
                    ? 'border-primary-500 bg-primary-600 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                }`}
              >
                {brand}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contador de resultados */}
      <p className="text-xs text-slate-400" role="status" aria-live="polite">
        Mostrando <span className="font-bold text-slate-200">{resultCount}</span> de{' '}
        <span className="font-bold text-slate-200">{totalCount}</span> equipos
      </p>
    </div>
  )
}
