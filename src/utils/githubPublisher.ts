import type { ONU } from '../types/onu'

export interface GithubConfig {
  githubToken: string
  repoOwner: string
  repoName: string
  branch: string
}

const CONFIG_KEY = 'onu-manuals:github-config'
const API_BASE = 'https://api.github.com'

export const DEFAULT_CONFIG: GithubConfig = {
  githubToken: '',
  repoOwner: '',
  repoName: '',
  branch: 'main',
}

export function loadConfig(): GithubConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GithubConfig>
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch {
    // localStorage no disponible o JSON corrupto: usamos la config por defecto.
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: GithubConfig): void {
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch {
    // localStorage no disponible.
  }
}

export function isConfigComplete(config: GithubConfig): boolean {
  return Boolean(
    config.githubToken.trim() && config.repoOwner.trim() && config.repoName.trim(),
  )
}

function configOrThrow(): GithubConfig {
  const config = loadConfig()
  if (!isConfigComplete(config)) {
    throw new Error('Configura tu Token de GitHub, Usuario y Repositorio antes de continuar.')
  }
  return config
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function githubFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(authHeaders(token))
  if (init?.headers) {
    const extra = new Headers(init.headers)
    extra.forEach((value, key) => headers.set(key, value))
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return

  let message = response.statusText
  try {
    const json = (await response.json()) as { message?: string }
    if (json?.message) message = json.message
  } catch {
    // El cuerpo no es JSON; mantenemos statusText.
  }

  throw new Error(`GitHub API (${response.status}): ${message}`)
}

function contentsEndpoint(config: GithubConfig, path: string): string {
  const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
  return `/repos/${encodeURIComponent(config.repoOwner)}/${encodeURIComponent(config.repoName)}/contents/${encodedPath}`
}

function btoaUnicode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function atobUnicode(base64: string): string {
  const clean = base64.replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Valida que el token y el repositorio existan y sean accesibles.
 */
export async function testConnection(): Promise<void> {
  const config = configOrThrow()
  const endpoint = `/repos/${encodeURIComponent(config.repoOwner)}/${encodeURIComponent(config.repoName)}`
  const response = await githubFetch(config.githubToken, endpoint)
  await assertOk(response)
}

/**
 * Sube (o actualiza) un archivo en el repositorio usando la API de contenidos.
 */
export async function uploadFile(path: string, contentBase64: string, message: string): Promise<void> {
  const config = configOrThrow()
  const endpoint = contentsEndpoint(config, path)

  let sha: string | undefined
  const existing = await githubFetch(config.githubToken, endpoint)
  if (existing.ok) {
    const json = (await existing.json()) as { sha?: string }
    sha = json.sha
  } else if (existing.status !== 404) {
    await assertOk(existing)
  }

  const body: Record<string, string> = {
    message,
    content: contentBase64,
    branch: config.branch,
  }
  if (sha) body.sha = sha

  const response = await githubFetch(config.githubToken, endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await assertOk(response)
}

function quote(value: string): string {
  return JSON.stringify(value)
}

function formatOnuEntry(onu: ONU): string {
  const lines: string[] = []

  lines.push('  {')
  lines.push(`    id: ${quote(onu.id)},`)
  lines.push(`    brand: ${quote(onu.brand)},`)
  lines.push(`    model: ${quote(onu.model)},`)
  lines.push(`    aliases: [${onu.aliases.map((alias) => quote(alias)).join(', ')}],`)
  lines.push(`    defaultIp: ${quote(onu.defaultIp)},`)
  lines.push('    credentials: {')
  lines.push(`      username: ${quote(onu.credentials.username)},`)
  lines.push(`      password: ${quote(onu.credentials.password)},`)
  lines.push('    },')
  lines.push(`    loginUiImage: ${quote(onu.loginUiImage)},`)

  if (onu.deviceImage) {
    lines.push(`    deviceImage: ${quote(onu.deviceImage)},`)
  }

  if (onu.legacyManuals && onu.legacyManuals.length > 0) {
    lines.push('    legacyManuals: [')
    onu.legacyManuals.forEach((manual) => {
      lines.push('      {')
      lines.push(`        label: ${quote(manual.label)},`)
      lines.push(`        url: ${quote(manual.url)},`)
      lines.push('      },')
    })
    lines.push('    ],')
  }

  if (onu.interactiveManual && onu.interactiveManual.length > 0) {
    lines.push('    interactiveManual: [')
    onu.interactiveManual.forEach((step) => {
      lines.push('      {')
      lines.push(`        stepNumber: ${step.stepNumber},`)
      lines.push(`        title: ${quote(step.title)},`)
      lines.push(`        description: ${quote(step.description)},`)
      if (step.screenshot) {
        lines.push(`        screenshot: ${quote(step.screenshot)},`)
      }
      if (step.checklist && step.checklist.length > 0) {
        lines.push(`        checklist: [${step.checklist.map((item) => quote(item)).join(', ')}],`)
      }
      lines.push('      },')
    })
    lines.push('    ],')
  }

  if (onu.notes) {
    lines.push(`    notes: ${quote(onu.notes)},`)
  }

  lines.push('  }')
  return lines.join('\n')
}

/**
 * Publica una ONU nueva:
 * 1. Sube la imagen de login (si hay) como `public/images/onus/<id>-login.webp`.
 * 2. Inserta la nueva entrada en el arreglo `ONUS` de `src/data/onus.ts`.
 */
export async function publishNewOnu(onu: ONU, imageBlobBase64?: string): Promise<void> {
  const config = configOrThrow()

  if (imageBlobBase64) {
    await uploadFile(
      `public/images/onus/${onu.id}-login.webp`,
      imageBlobBase64,
      `feat(onu): imagen de login ${onu.id}`,
    )
  }

  const dataPath = 'src/data/onus.ts'
  const endpoint = contentsEndpoint(config, dataPath)

  const existing = await githubFetch(config.githubToken, endpoint)
  await assertOk(existing)
  const json = (await existing.json()) as { content: string; sha: string }

  const current = atobUnicode(json.content)
  const sha = json.sha

  const closeIndex = current.lastIndexOf(']')
  if (closeIndex < 0) {
    throw new Error('No se pudo localizar el arreglo ONUS en src/data/onus.ts.')
  }

  const entry = formatOnuEntry(onu)
  const updated = `${current.slice(0, closeIndex)}${entry},\n${current.slice(closeIndex)}`

  const body = {
    message: `feat(onu): agrega ${onu.brand} ${onu.model} (${onu.id})`,
    content: btoaUnicode(updated),
    sha,
    branch: config.branch,
  }

  const response = await githubFetch(config.githubToken, endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await assertOk(response)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Localiza el rango (índice de `{` y de `}`) del objeto de una ONU dentro
 * del contenido de `onus.ts`, buscando por su propiedad `id`.
 */
function findEntryRange(
  content: string,
  id: string,
): { start: number; end: number } | null {
  const idPattern = new RegExp(`\\n    id: ['"]${escapeRegExp(id)}['"],`)
  const idMatch = idPattern.exec(content)
  if (!idMatch) return null

  const start = content.lastIndexOf('{', idMatch.index)
  if (start < 0) return null

  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = start; i < content.length; i++) {
    const char = content[i]

    if (inString) {
      if (char === '\\') {
        i++
        continue
      }
      if (char === stringChar) {
        inString = false
      }
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      continue
    }

    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        return { start, end: i }
      }
    }
  }

  return null
}

/**
 * Actualiza una ONU existente:
 * 1. Sobrescribe la imagen de login si se subió una nueva.
 * 2. Reemplaza el objeto de la ONU (localizado por `id`) en `src/data/onus.ts`.
 */
export async function updateExistingOnu(onu: ONU, newImageBlobBase64?: string): Promise<void> {
  const config = configOrThrow()

  if (newImageBlobBase64) {
    await uploadFile(
      `public/images/onus/${onu.id}-login.webp`,
      newImageBlobBase64,
      `feat(onu): actualiza imagen de login ${onu.id}`,
    )
  }

  const dataPath = 'src/data/onus.ts'
  const endpoint = contentsEndpoint(config, dataPath)

  const existing = await githubFetch(config.githubToken, endpoint)
  await assertOk(existing)
  const json = (await existing.json()) as { content: string; sha: string }

  const current = atobUnicode(json.content)
  const sha = json.sha

  const range = findEntryRange(current, onu.id)
  if (!range) {
    throw new Error(`No se encontró la ONU "${onu.id}" en src/data/onus.ts.`)
  }

  const entry = formatOnuEntry(onu)
  const updated = `${current.slice(0, range.start)}${entry}${current.slice(range.end + 1)}`

  const body = {
    message: `feat(onu): actualiza ${onu.brand} ${onu.model} (${onu.id})`,
    content: btoaUnicode(updated),
    sha,
    branch: config.branch,
  }

  const response = await githubFetch(config.githubToken, endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await assertOk(response)
}
