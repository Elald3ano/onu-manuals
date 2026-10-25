import { RadioTower, Settings, Wifi, WifiOff } from 'lucide-react'

interface HeaderProps {
  isOnline: boolean
}

export function Header({ isOnline }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <a
          href="#/"
          aria-label="Ir al catálogo"
          className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/40">
            <RadioTower className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-tight">ONU Manuals</span>
            <span className="block truncate text-[11px] font-medium text-slate-400">
              Catálogo de Manuales ONU
            </span>
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              isOnline
                ? 'bg-success-600/15 text-success-400'
                : 'bg-red-500/15 text-red-400'
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
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  )
}
