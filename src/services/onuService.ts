import type { ONU } from '../types/onu'
import type { OnusInsert, OnusRow } from '../types/database'
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase'
import { INITIAL_ONUS } from '../data/onus'
import { compressImage } from '../utils/imageCompressor'

/** Bucket público de fotos en Supabase Storage. */
export const ONU_IMAGES_BUCKET = 'onu-images'

/** Clave de caché offline del catálogo. */
export const ONUS_CACHE_KEY = 'onu-manuals:onus-cache:v1'

/** Tiempo máximo de espera de la API antes de caer a la caché local. */
const FETCH_TIMEOUT_MS = 6000

export type OnuSource = 'supabase' | 'cache' | 'fallback'
export type SaveStage = 'photos' | 'record'

/** Imagen asociada a un paso del checklist que se subirá junto con la ONU. */
export interface StepImageUpload {
  stepNumber: number
  file: File
}

export interface FetchOnusResult {
  onus: ONU[]
  source: OnuSource
}

interface OnusCachePayload {
  version: 1
  updatedAt: string
  onus: ONU[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOnu(value: unknown): value is ONU {
  if (!isRecord(value)) return false
  const credentials = value.credentials
  return (
    typeof value.id === 'string' &&
    typeof value.brand === 'string' &&
    typeof value.model === 'string' &&
    Array.isArray(value.aliases) &&
    typeof value.defaultIp === 'string' &&
    isRecord(credentials) &&
    typeof credentials.username === 'string' &&
    typeof credentials.password === 'string' &&
    typeof value.loginUiImage === 'string'
  )
}

/** Orden estable por marca y modelo (respeta acentos y mayúsculas). */
export function sortOnus(onus: ONU[]): ONU[] {
  return [...onus].sort((a, b) => {
    const byBrand = a.brand.localeCompare(b.brand, 'es', { sensitivity: 'base' })
    if (byBrand !== 0) return byBrand
    return a.model.localeCompare(b.model, 'es', { sensitivity: 'base' })
  })
}

/** Convierte una fila de Supabase al modelo de la app. */
export function mapRowToOnu(row: OnusRow): ONU {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    defaultIp: row.default_ip ?? '',
    credentials: {
      username: row.username,
      password: row.password,
    },
    loginUiImage: row.login_ui_image ?? '',
    deviceImage: row.device_image ?? undefined,
    legacyManuals:
      Array.isArray(row.legacy_manuals) && row.legacy_manuals.length > 0
        ? row.legacy_manuals
        : undefined,
    interactiveManual:
      Array.isArray(row.interactive_manual) && row.interactive_manual.length > 0
        ? row.interactive_manual
        : undefined,
    notes: row.notes ?? undefined,
  }
}

/** Convierte el modelo de la app a una fila insertable en Supabase. */
export function mapOnuToRow(onu: ONU): OnusInsert {
  return {
    id: onu.id,
    brand: onu.brand,
    model: onu.model,
    aliases: onu.aliases,
    default_ip: onu.defaultIp,
    username: onu.credentials.username,
    password: onu.credentials.password,
    login_ui_image: onu.loginUiImage,
    device_image: onu.deviceImage ?? null,
    legacy_manuals: onu.legacyManuals ?? [],
    interactive_manual: onu.interactiveManual ?? null,
    notes: onu.notes ?? null,
  }
}

/**
 * Lee la caché local. Devuelve `null` si no existe o está corrupta.
 * Un catálogo vacío guardado deliberadamente devuelve `[]`.
 */
export function readOnuCache(): ONU[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ONUS_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      return parsed.filter(isOnu)
    }

    if (isRecord(parsed) && Array.isArray(parsed.onus)) {
      return parsed.onus.filter(isOnu)
    }
  } catch {
    // JSON corrupto o localStorage no disponible.
  }
  return null
}

/** Persiste el catálogo para uso offline. */
export function writeOnuCache(onus: ONU[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload: OnusCachePayload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      onus,
    }
    window.localStorage.setItem(ONUS_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Cuota llena o modo privado: la app sigue funcionando en memoria.
  }
}

/**
 * Consulta Supabase y devuelve también el origen de los datos.
 * Si falla la red, cae a la caché local y, en último término, al catálogo
 * empaquetado (`INITIAL_ONUS`).
 */
export async function fetchOnusWithSource(): Promise<FetchOnusResult> {
  const cached = readOnuCache()

  if (!isSupabaseConfigured || !supabase) {
    return { onus: cached ?? INITIAL_ONUS, source: cached ? 'cache' : 'fallback' }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { onus: cached ?? INITIAL_ONUS, source: cached ? 'cache' : 'fallback' }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const { data, error } = await supabase
      .from('onus')
      .select('*')
      .abortSignal(controller.signal)
    if (error) throw new Error(error.message)

    const onus = sortOnus((data ?? []).map(mapRowToOnu))
    writeOnuCache(onus)
    return { onus, source: 'supabase' }
  } catch (error) {
    console.warn('No se pudo consultar Supabase; se usa la caché local.', error)
    return { onus: cached ?? INITIAL_ONUS, source: cached ? 'cache' : 'fallback' }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

/**
 * Catálogo híbrido offline-first.
 * 1. Intenta Supabase.
 * 2. Guarda el resultado en localStorage.
 * 3. Si falla o no hay red, devuelve caché local o `INITIAL_ONUS`.
 */
export async function fetchOnus(): Promise<ONU[]> {
  const { onus } = await fetchOnusWithSource()
  return onus
}

async function uploadWebp(file: File, remotePath: string): Promise<string> {
  const client = requireSupabase()
  const compressed = await compressImage(file, 1200, 1200, 0.85)

  try {
    const { error } = await client.storage
      .from(ONU_IMAGES_BUCKET)
      .upload(remotePath, compressed.blob, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000',
      })

    if (error) {
      throw new Error(`No se pudo subir la imagen "${remotePath}": ${error.message}`)
    }

    return client.storage.from(ONU_IMAGES_BUCKET).getPublicUrl(remotePath).data.publicUrl
  } finally {
    URL.revokeObjectURL(compressed.previewUrl)
  }
}

/**
 * Guarda (inserta o actualiza) una ONU en Supabase.
 * Si se reciben imágenes, las comprime a WebP y las sube al bucket público.
 * Las capturas de pasos usan una ruta estable y un query de versión para
 * evitar que el service worker sirva una captura antigua tras reemplazarla.
 *
 * Requiere una sesión autenticada: RLS solo permite escritura a `authenticated`.
 */
export async function saveOnu(
  onu: ONU,
  loginImageFile?: File,
  deviceImageFile?: File,
  stepImages: StepImageUpload[] = [],
  onStage?: (stage: SaveStage) => void,
): Promise<ONU> {
  const client = requireSupabase()
  const stamp = Date.now().toString(36)
  const hasImages = Boolean(loginImageFile || deviceImageFile || stepImages.length > 0)

  if (hasImages) onStage?.('photos')

  let loginUiImage = onu.loginUiImage
  let deviceImage = onu.deviceImage
  let interactiveManual = onu.interactiveManual

  if (loginImageFile) {
    loginUiImage = await uploadWebp(loginImageFile, `${onu.id}-login-${stamp}.webp`)
  }

  if (deviceImageFile) {
    deviceImage = await uploadWebp(deviceImageFile, `${onu.id}-device-${stamp}.webp`)
  }

  if (interactiveManual && stepImages.length > 0) {
    const uploads = new Map(stepImages.map((item) => [item.stepNumber, item.file]))

    interactiveManual = await Promise.all(
      interactiveManual.map(async (step) => {
        const file = uploads.get(step.stepNumber)
        if (!file) return step

        const baseUrl = await uploadWebp(file, `steps/${onu.id}-step-${step.stepNumber}.webp`)
        return { ...step, screenshot: `${baseUrl}?v=${stamp}` }
      }),
    )
  }

  onStage?.('record')

  const row = mapOnuToRow({ ...onu, loginUiImage, deviceImage, interactiveManual })
  const { data, error } = await client
    .from('onus')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    if (error.code === '42501' || /row-level security|permission denied/i.test(error.message)) {
      throw new Error(
        'No tienes permisos para guardar. Inicia sesión con una cuenta administradora de Supabase.',
      )
    }
    throw new Error(`No se pudo guardar en Supabase: ${error.message}`)
  }

  if (!data) {
    throw new Error('Supabase no devolvió el registro guardado.')
  }

  const saved = mapRowToOnu(data)
  const cached = readOnuCache() ?? []
  const next = cached.some((item) => item.id === saved.id)
    ? cached.map((item) => (item.id === saved.id ? saved : item))
    : [...cached, saved]

  writeOnuCache(sortOnus(next))
  return saved
}
