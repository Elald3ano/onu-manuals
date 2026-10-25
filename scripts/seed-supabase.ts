import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { ONUS } from '../src/data/onus'
import type { OnusInsert } from '../src/types/database'

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, 'public')
const BUCKET = 'onu-images'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

/** Carga .env sin dependencias externas (no sobrescribe variables ya definidas). */
function loadDotEnv(): void {
  const envPath = path.join(ROOT, '.env')
  if (!existsSync(envPath)) return

  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue

    const equalsIndex = line.indexOf('=')
    if (equalsIndex <= 0) continue

    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv()

const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim()
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '').trim()
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
const adminEmail = (process.env.SUPABASE_ADMIN_EMAIL ?? '').trim()
const adminPassword = process.env.SUPABASE_ADMIN_PASSWORD ?? ''

if (!supabaseUrl) {
  console.error('Falta VITE_SUPABASE_URL (o SUPABASE_URL) en .env.')
  process.exit(1)
}

const apiKey = serviceRoleKey || anonKey
if (!apiKey) {
  console.error('Falta VITE_SUPABASE_ANON_KEY (o SUPABASE_ANON_KEY) en .env.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, apiKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

function resolveLocalImage(value: string | undefined | null): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return null

  const relative = value.replace(/^\/+/, '')
  const candidates = [path.join(PUBLIC_DIR, relative), path.join(ROOT, relative)]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

async function ensureBucket(client: SupabaseClient): Promise<void> {
  // Con una sesión normal no podemos inspeccionar el bucket; schema.sql ya lo crea.
  // Solo con service_role lo verificamos/creamos automáticamente.
  if (!serviceRoleKey) return

  const { data } = await client.storage.getBucket(BUCKET)
  if (data) return

  const created = await client.storage.createBucket(BUCKET, { public: true })
  if (created.error) {
    throw new Error(`No se pudo crear el bucket "${BUCKET}": ${created.error.message}`)
  }
  console.log(`Bucket "${BUCKET}" creado (público).`)
}

interface UploadResult {
  url: string | null
  uploaded: boolean
}

async function uploadImage(
  client: SupabaseClient,
  onuId: string,
  kind: 'login' | 'device',
  value: string | undefined | null,
): Promise<UploadResult> {
  if (!value) return { url: null, uploaded: false }
  if (/^https?:\/\//i.test(value)) return { url: value, uploaded: false }

  const localPath = resolveLocalImage(value)
  if (!localPath) {
    console.warn(`\n  ⚠ No se encontró la imagen local "${value}" para ${onuId}.`)
    return { url: null, uploaded: false }
  }

  const extension = path.extname(localPath).toLowerCase() || '.png'
  const contentType = MIME_TYPES[extension] ?? 'application/octet-stream'
  const remotePath = `${onuId}-${kind}${extension}`
  const bytes = readFileSync(localPath)

  const { error } = await client.storage.from(BUCKET).upload(remotePath, bytes, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  })

  if (error) {
    throw new Error(`No se pudo subir "${localPath}": ${error.message}`)
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(remotePath)
  return { url: data.publicUrl, uploaded: true }
}

async function main(): Promise<void> {
  console.log(`Proyecto: ${supabaseUrl}`)
  console.log(
    `Modo de escritura: ${serviceRoleKey ? 'service_role (solo local)' : 'sesión de administrador'}`,
  )

  if (!serviceRoleKey) {
    if (!adminEmail || !adminPassword) {
      throw new Error(
        'Define SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ADMIN_EMAIL + SUPABASE_ADMIN_PASSWORD en .env ' +
          'para poder escribir (RLS exige autenticación).',
      )
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    })
    if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`)
    console.log(`Sesión iniciada como ${adminEmail}`)
  }

  await ensureBucket(supabase)

  let uploaded = 0
  let records = 0
  const failures: string[] = []

  for (const onu of ONUS) {
    process.stdout.write(`• ${onu.id} … `)

    try {
      const login = await uploadImage(supabase, onu.id, 'login', onu.loginUiImage)
      if (login.uploaded) uploaded += 1

      const device = await uploadImage(supabase, onu.id, 'device', onu.deviceImage)
      if (device.uploaded) uploaded += 1

      const row: OnusInsert = {
        id: onu.id,
        brand: onu.brand,
        model: onu.model,
        aliases: onu.aliases,
        default_ip: onu.defaultIp,
        username: onu.credentials.username,
        password: onu.credentials.password,
        login_ui_image: login.url ?? '',
        device_image: device.url,
        legacy_manuals: onu.legacyManuals ?? [],
        interactive_manual: onu.interactiveManual ?? null,
        notes: onu.notes ?? null,
      }

      const { error } = await supabase.from('onus').upsert(row, { onConflict: 'id' })
      if (error) throw new Error(error.message)

      records += 1
      const suffix = login.uploaded || device.uploaded ? ' (imágenes subidas)' : ''
      console.log(`OK${suffix}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${onu.id}: ${message}`)
      console.log(`ERROR: ${message}`)
    }
  }

  console.log('\nResumen:')
  console.log(`  ONUs insertadas/actualizadas: ${records}/${ONUS.length}`)
  console.log(`  Imágenes subidas: ${uploaded}`)

  if (failures.length > 0) {
    console.log(`  Errores: ${failures.length}`)
    for (const failure of failures) console.log(`   - ${failure}`)
    process.exitCode = 1
  }
}

void main().catch((error) => {
  console.error('\nError fatal:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
