import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // Rutas relativas: el build funciona en GitHub Pages (subcarpeta del repo)
  // sin necesidad de configurar un dominio o una ruta base absoluta.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inyecta el registro del Service Worker solo si no lo importamos manualmente.
      injectRegister: 'auto',
      // Archivos adicionales que se copian al precaché y al manifest.
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'images/onus/**/*'],
      manifest: {
        name: 'Catálogo de Manuales ONU',
        short_name: 'ONU Manuals',
        description: 'Guía rápida y manuales de configuración de ONUs para técnicos',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        categories: ['utilities', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        // Precaché de los estáticos generados por Vite (js, css, html, imágenes, fuentes).
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,woff,woff2,json,txt}'],
        // Elimina cachés de versiones anteriores del SW.
        cleanupOutdatedCaches: true,
        // Fallback de navegación para que la SPA funcione offline.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Imágenes (incluye capturas, logos y fotos de ONUs).
            urlPattern: /\.(?:png|jpe?g|svg|webp|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onu-imagenes',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fuentes tipográficas.
            urlPattern: /\.(?:woff2?|ttf|otf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onu-fuentes',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
