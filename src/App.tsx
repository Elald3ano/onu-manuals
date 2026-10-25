import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useHashRoute } from './hooks/useHashRoute'
import { useOnusCatalog } from './hooks/useOnusCatalog'
import { Header } from './components/Header'
import { CatalogView } from './pages/CatalogView'
import { DetailView } from './pages/DetailView'
import { AdminView } from './pages/AdminView'

export default function App() {
  const isOnline = useOnlineStatus()
  const { route, params, query, navigate } = useHashRoute()
  const { onus, loading, applySaved } = useOnusCatalog()

  return (
    <div className="flex min-h-screen flex-col bg-fiber-dark text-slate-100">
      <Header isOnline={isOnline} />

      {/* Contenido según la ruta hash */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:py-6">
        {route === 'catalog' && (
          <CatalogView
            onus={onus}
            loading={loading}
            onOpenOnu={(id) => navigate(`#/onu/${id}`)}
          />
        )}

        {route === 'detail' && params.id && (
          <DetailView key={params.id} id={params.id} onus={onus} loading={loading} />
        )}

        {route === 'admin' && (
          <AdminView
            editId={query.edit}
            onus={onus}
            loading={loading}
            onSaved={applySaved}
          />
        )}
      </main>

      <footer className="safe-bottom border-t border-fiber-border/70 px-4 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        onu-manuals v0.1.0 · PWA Mobile-First · Funciona sin conexión
      </footer>
    </div>
  )
}
