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
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fiber-teal/70"
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
          className="h-14 w-full rounded-2xl border border-fiber-border bg-fiber-card/80 pl-12 pr-12 font-mono text-base font-medium text-slate-100 placeholder:text-slate-500 shadow-card-glow transition-colors focus:border-fiber-teal focus:outline-none focus:ring-2 focus:ring-fiber-teal/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
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
                className={`shrink-0 rounded-full border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan ${
                  isActive
                    ? 'border-fiber-cyan bg-fiber-teal/20 text-fiber-cyan shadow-cyan-glow'
                    : 'border-fiber-border bg-fiber-card text-slate-400 hover:border-fiber-teal/60 hover:text-fiber-cyan'
                }`}
              >
                {brand}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contador de resultados */}
      <p
        className="font-mono text-[11px] uppercase tracking-wider text-slate-500"
        role="status"
        aria-live="polite"
      >
        Mostrando <span className="font-bold text-fiber-cyan">{resultCount}</span> de{' '}
        <span className="font-bold text-slate-300">{totalCount}</span> equipos
      </p>
    </div>
  )
}
