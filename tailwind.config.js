/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidad "Industrial Cyber-Fiber": consola táctica de fibra óptica.
        fiber: {
          dark: '#070b12', // Fondo principal ultra oscuro (ahorro batería OLED)
          card: '#0f172a', // Superficie de tarjetas
          cardHover: '#131e36', // Hover suave
          border: '#1e293b', // Bordes sutiles
          borderGlow: '#06b6d4', // Borde con destello
          cyan: '#00f2fe', // Láser de fibra óptica (acento principal)
          teal: '#06b6d4', // Primario de soporte
          amber: '#f59e0b', // Táctico para credenciales e IPs
          emerald: '#10b981', // Confirmaciones y copiado
        },
        // Alias semánticos heredados por los componentes, alineados a la
        // nueva identidad (cian/turquesa) para mantener coherencia visual.
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Confirmaciones, copiado y estados correctos.
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
      },
      fontFamily: {
        // Pila de fuentes del sistema: sin descargas de webfonts (100% offline).
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Acento "consola táctica". Si no hay fuente local, cae al mono del sistema.
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -5px rgba(6, 182, 212, 0.25)',
        'card-glow': '0 8px 30px -10px rgba(0, 242, 254, 0.1)',
      },
    },
  },
  plugins: [],
}
