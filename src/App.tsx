import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useHashRoute } from './hooks/useHashRoute'
import { ONUS } from './data/onus'
import { Header } from './components/Header'
import { CatalogView } from './pages/CatalogView'
import { DetailView } from './pages/DetailView'
import { AdminView } from './pages/AdminView'

export default function App() {
  const isOnline = useOnlineStatus()
  const { route, params, query, navigate } = useHashRoute()

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100">
      <Header isOnline={isOnline} />

      {/* Contenido según la ruta hash */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">
        {route === 'catalog' && (
          <CatalogView onus={ONUS} onOpenOnu={(id) => navigate(`#/onu/${id}`)} />
        )}

        {route === 'detail' && params.id && <DetailView key={params.id} id={params.id} />}

        {route === 'admin' && <AdminView editId={query.edit} />}
      </main>

      <footer className="safe-bottom border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-500">
        onu-manuals v0.1.0 · PWA Mobile-First · Funciona sin conexión
      </footer>
    </div>
  )
}
