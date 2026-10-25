# onu-manuals

PWA **Mobile-First** para técnicos de telecomunicaciones en campo: guía rápida y
manuales de configuración de ONUs, con soporte **offline** y despliegue automático
en **GitHub Pages**.

## Stack

- [Vite](https://vitejs.dev/) 5 + [React](https://react.dev/) 18 + [TypeScript](https://www.typescriptlang.org/) 5
- [Tailwind CSS](https://tailwindcss.com/) 3 (paleta de alto contraste para trabajo con sol)
- [lucide-react](https://lucide.dev/) para iconos de red, copiar, compartir, wifi, etc.
- [Fuse.js](https://fusejs.io/) para búsqueda difusa instantánea
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + Workbox para la PWA offline

## Requisitos

- Node.js `>= 18.18` (CI usa Node 20)

## Comandos

```bash
npm install        # instala dependencias
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm run build      # type-check + build de producción (carpeta dist/)
npm run preview    # sirve el build de producción localmente
npm run icons      # regenera los iconos PWA (PNG) — solo Windows
```

## Estructura

```
onu-manuals/
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── public/
│   ├── images/onus/               # fotos / capturas de las ONUs
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png / pwa-512x512.png / maskable-512x512.png
│   └── .nojekyll                  # evita el procesado Jekyll en Pages
├── scripts/generate-icons.ps1     # genera los iconos PNG
├── src/
│   ├── components/                # componentes reutilizables
│   │   └── admin/                 # componentes del panel admin
│   ├── data/                      # catálogo de ONUs y manuales
│   ├── hooks/                     # hooks (useOnlineStatus, ...)
│   ├── pages/                     # vistas/pantallas
│   ├── types/                     # tipos TypeScript
│   ├── utils/                     # utilidades (búsqueda Fuse.js, etc.)
│   ├── App.tsx                    # vista de arranque (verificación)
│   ├── main.tsx                   # entrada + registro del Service Worker
│   └── index.css                  # directivas Tailwind + reglas móviles
├── index.html
├── vite.config.ts                 # Vite + VitePWA (base relativa './')
├── tailwind.config.js
├── postcss.config.js
└── tsconfig*.json
```

## Despliegue en GitHub Pages

El build usa `base: './'` (rutas relativas), por lo que funciona sin importar el
nombre del repositorio o subruta. Para publicar:

1. Crea un repositorio en GitHub y sube el código a la rama `main`:
   ```bash
   git init
   git add .
   git commit -m "chore: inicializar onu-manuals"
   git branch -M main
   git remote add origin https://github.com/<usuario>/<repo>.git
   git push -u origin main
   ```
2. En el repositorio: **Settings → Pages → Source → GitHub Actions**.
3. Cada `push` a `main` compila y publica automáticamente con
   `.github/workflows/deploy.yml`.

## PWA / Offline

- `registerType: 'autoUpdate'`: la nueva versión se aplica en cuanto está disponible.
- Precaché de estáticos (js, css, html, imágenes) y caché en runtime de imágenes
  (`png, jpg, jpeg, svg, webp`) y fuentes.
- Manifiesto con `display: standalone`, `orientation: portrait` y colores de tema
  `#1e293b` / `#0f172a`.
