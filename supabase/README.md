# Supabase · onu-manuals

Backend para desacoplar datos y fotos del repositorio Git. Los cambios del panel
se guardan en Supabase y se reflejan en la web sin commits ni builds.

## 1. Provisionar tablas, políticas y bucket

En **Supabase Dashboard → SQL Editor → New query**:

1. Ejecuta `supabase/schema.sql`
   - Tabla `public.onus`
   - RLS: lectura pública, escritura solo `authenticated`
   - Realtime habilitado para `onus`
   - Bucket `onu-images` (lectura pública, escritura autenticada)
2. Ejecuta `supabase/seed.sql` (opcional si vas a usar el script del paso 3)
   - Inserta las 16 ONUs actuales de forma idempotente.

## 2. Crear el usuario administrador

**Authentication → Users → Add user**

- Email y contraseña del administrador.
- Marca **Auto Confirm User** (o confirma el correo).

> **Importante:** desactiva el registro público en
> **Authentication → Providers → Email → “Allow new users to sign up”**.
> Si lo dejas abierto, cualquier persona podría crear una cuenta y, al quedar
> `authenticated`, escribir en `onus` y en Storage. Crea solo la cuenta
> administradora desde el dashboard.

Ese usuario podrá crear/editar/borrar ONUs y subir fotos. Sin sesión, la `anon key`
solo puede leer.

## 3. Migrar las 16 ONUs y sus fotos

Completa en `.env` **una** de estas opciones (solo local, nunca en el navegador):

```env
# Opción A (recomendada): cuenta administradora
SUPABASE_ADMIN_EMAIL=admin@tu-dominio.com
SUPABASE_ADMIN_PASSWORD=tu-password

# Opción B: service_role key (solo local)
# SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

Después ejecuta:

```bash
npm run seed:supabase
```

El script:

- Sube las imágenes de `public/images/onus/` al bucket `onu-images`.
- Inserta/actualiza las 16 ONUs con las URLs públicas del bucket.
- Es idempotente: puedes ejecutarlo varias veces.

## 4. Variables para el build de GitHub Pages

Vite incrusta las variables `VITE_*` **en tiempo de build**. El `.env` local no
llega a GitHub Actions, así que hay que definirlas en el repositorio:

**Settings → Secrets and variables → Actions → Variables**

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://pewyfjimyggcwadjsrxm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | JWT con rol `anon` |

El workflow `.github/workflows/deploy.yml` ya las pasa al step de build. Si no
están definidas, la app funciona en modo local con `INITIAL_ONUS` y el panel
muestra “Supabase no configurado”.

## 5. Cómo funciona

- `src/services/onuService.ts`
  - `fetchOnus()`: consulta `onus`, guarda en `localStorage` y cae a la caché o
    a `INITIAL_ONUS` si no hay red.
  - `saveOnu()`: comprime las fotos a WebP, las sube a `onu-images`, hace
    `upsert` del registro y actualiza la caché.
- `src/hooks/useOnusCatalog.ts`: pinta la caché al instante, sincroniza en
  segundo plano y escucha cambios Realtime.
- `src/hooks/useSupabaseAuth.ts`: sesión del administrador (email/contraseña).
- `src/pages/AdminView.tsx`: guarda con Supabase y muestra el progreso
  “Subiendo fotos…” → “Guardando registro…”.

## 6. Seguridad

- **Desactiva el registro público** (ver paso 2). Si está abierto, cualquiera
  puede registrarse y escribir, porque RLS confía en cualquier usuario
  `authenticated`.
- **Nunca** uses la clave `service_role` en el navegador ni en una variable `VITE_*`.
  Se incrusta en el JavaScript público y salta RLS.
- La clave `anon` es pública por diseño; la protección real son las políticas RLS.
- Si la `service_role` se compartió o filtró, rota el JWT secret en
  **Project Settings → API → JWT Settings**.
- El panel exige sesión para escribir. La lectura del catálogo es pública.
- La lectura pública incluye las credenciales de campo de las ONUs, igual que
  cuando estaban en el bundle estático. Si quieres restringirla, habría que
  exigir sesión también para leer, a costa del uso offline anónimo.

## 7. Rutas de imágenes

El catálogo empaquetado (`src/data/onus.ts`) conserva rutas relativas
(`images/onus/<id>-login.png`) como fallback offline. El seed y el panel guardan
URLs públicas del bucket `onu-images` en `login_ui_image` y `device_image`.
