import { RadioTower, Settings, Wifi, WifiOff } from 'lucide-react'

interface HeaderProps {
  isOnline: boolean
}

export function Header({ isOnline }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-fiber-border/80 bg-fiber-dark/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <a
          href="#/"
          aria-label="Ir al catálogo"
          className="group flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fiber-teal/40 bg-gradient-to-br from-fiber-teal/25 to-fiber-cyan/10 shadow-cyan-glow">
            <RadioTower
              className="h-5 w-5 text-fiber-cyan transition-transform duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-fiber-cyan fiber-pulse" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-mono text-base font-bold uppercase tracking-[0.12em] text-slate-50">
              ONU Manuals
            </span>
            <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Catálogo de Manuales ONU
            </span>
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
              isOnline
                ? 'border-fiber-emerald/40 bg-fiber-emerald/10 text-fiber-emerald'
                : 'border-red-500/40 bg-red-500/10 text-red-400'
            }`}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" aria-hidden="true" />
            ) : (
              <WifiOff className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <a
            href="#/admin"
            aria-label="Panel de administración"
            title="Panel de administración"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-fiber-border bg-fiber-card text-slate-400 transition-all duration-200 hover:border-fiber-teal/60 hover:text-fiber-cyan hover:shadow-cyan-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  )
}
