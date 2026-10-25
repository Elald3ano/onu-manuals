import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Registro del Service Worker (PWA). Con `registerType: 'autoUpdate'`,
// `immediate` aplica la nueva versión en cuanto está disponible.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
