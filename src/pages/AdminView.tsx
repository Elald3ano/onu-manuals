import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, DragEvent, ReactNode, SetStateAction } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Info,
  Loader2,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import type { ONU, LegacyManualLink, ManualStep } from '../types/onu'
import { getOnuById, ONUS } from '../data/onus'
import { compressImage } from '../utils/imageCompressor'
import { serializeOnusFile } from '../utils/onusSerializer'
import {
  isConfigComplete,
  loadConfig,
  publishNewOnu,
  saveConfig,
  testConnection,
  updateExistingOnu,
  type GithubConfig,
} from '../utils/githubPublisher'
import { copyText } from '../utils/clipboard'

type PublishStatus = 'idle' | 'compressing' | 'uploading' | 'success' | 'error'
type ActionMode = 'manual' | 'advanced'

interface ManualDraft {
  label: string
  url: string
}

interface StepDraft {
  title: string
  description: string
  checklistText: string
}

interface ImageSlot {
  file: File | null
  blob: Blob | null
  preview: string | null
  sizeKb: number | null
  error: string | null
  existingPath: string | null
}

const inputClass =
  'w-full rounded-xl border border-fiber-border bg-fiber-dark/60 px-3 py-2.5 font-mono text-base text-slate-100 placeholder:text-slate-500 transition-colors focus:border-fiber-teal focus:outline-none focus:ring-2 focus:ring-fiber-teal/30'

function emptySlot(): ImageSlot {
  return { file: null, blob: null, preview: null, sizeKb: null, error: null, existingPath: null }
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}

function ImageDropzone({
  title,
  hint,
  targetName,
  slot,
  onFile,
  onClear,
}: {
  title: string
  hint: string
  targetName: string
  slot: ImageSlot
  onFile: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const blob = slot.blob

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{title}</p>

      {slot.preview ? (
        <>
          <div className="relative overflow-hidden rounded-xl border border-fiber-border bg-fiber-dark">
            <img src={slot.preview} alt={title} className="h-36 w-full object-contain" />
            <button
              type="button"
              onClick={onClear}
              aria-label={`Quitar ${title}`}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-fiber-border bg-fiber-dark/80 text-slate-100 backdrop-blur transition-colors hover:border-fiber-teal/60 hover:bg-fiber-cardHover"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 rounded-lg border border-fiber-border bg-fiber-dark/80 px-2 py-1 font-mono text-[11px] font-bold text-slate-100 backdrop-blur transition-colors hover:border-fiber-teal/60 hover:bg-fiber-cardHover"
            >
              Reemplazar
            </button>
          </div>
          <p className="font-mono text-[11px] font-medium text-slate-400">
            {slot.sizeKb !== null ? `Comprimido: ${slot.sizeKb} KB en WebP` : 'Imagen actual'}
            {slot.file ? ' · nueva' : ''}
          </p>
          <p className="font-mono text-[11px] text-slate-500">
            Se guardará como <code className="font-mono text-fiber-cyan/90">{targetName}</code>
          </p>
          {blob && (
            <button
              type="button"
              onClick={() => downloadBlob(blob, targetName.split('/').pop() ?? 'imagen.webp')}
              className="w-fit rounded-lg border border-fiber-border px-2 py-1 font-mono text-[11px] font-bold text-slate-300 transition-colors hover:border-fiber-teal/60 hover:text-fiber-cyan"
            >
              ⬇ Descargar .webp
            </button>
          )}
        </>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? 'border-fiber-cyan bg-fiber-teal/10 shadow-cyan-glow'
              : 'border-fiber-border bg-fiber-dark/40 hover:border-fiber-teal/60'
          }`}
        >
          <ImagePlus className="h-7 w-7 text-fiber-teal/60" aria-hidden="true" />
          <p className="font-mono text-xs font-semibold text-slate-300">{hint}</p>
          <p className="font-mono text-[11px] text-slate-500">PNG / JPG · se optimiza a WebP</p>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleInput} className="hidden" />

      {slot.error && <p className="text-xs font-medium text-red-400">{slot.error}</p>}
    </div>
  )
}

function SettingsModal({
  config,
  onChange,
  onClose,
}: {
  config: GithubConfig
  onChange: (config: GithubConfig) => void
  onClose: () => void
}) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const update = (patch: Partial<GithubConfig>) => onChange({ ...config, ...patch })

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      saveConfig(config)
      await testConnection()
      setTestResult({ ok: true, message: 'Conexión exitosa: token y repositorio válidos.' })
    } catch (error) {
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : 'No se pudo conectar.',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    saveConfig(config)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fiber-dark/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de GitHub"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-fiber-border bg-fiber-card p-5 shadow-cyan-glow sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-fiber-cyan" aria-hidden="true" />
            <h2 className="font-mono text-base font-bold uppercase tracking-wide text-slate-50">Configuración de GitHub</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-fiber-cardHover hover:text-fiber-cyan"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-slate-400">
          Opcional: solo necesaria para el push directo por API. El token se guarda solo en este
          dispositivo (localStorage) y requiere permiso <code className="font-mono text-fiber-cyan/90">repo</code>{' '}
          o <code className="font-mono text-fiber-cyan/90">contents:write</code>.
        </p>

        <div className="flex flex-col gap-3">
          <Field label="Token (PAT)" required>
            <input
              type="password"
              value={config.githubToken}
              onChange={(event) => update({ githubToken: event.target.value })}
              placeholder="ghp_…"
              autoComplete="off"
              className={inputClass}
            />
          </Field>

          <Field label="Usuario / Organización" required>
            <input
              type="text"
              value={config.repoOwner}
              onChange={(event) => update({ repoOwner: event.target.value })}
              placeholder="tu-usuario"
              autoComplete="off"
              className={inputClass}
            />
          </Field>

          <Field label="Repositorio" required>
            <input
              type="text"
              value={config.repoName}
              onChange={(event) => update({ repoName: event.target.value })}
              placeholder="onu-manuals"
              autoComplete="off"
              className={inputClass}
            />
          </Field>

          <Field label="Rama">
            <input
              type="text"
              value={config.branch}
              onChange={(event) => update({ branch: event.target.value })}
              placeholder="main"
              autoComplete="off"
              className={inputClass}
            />
          </Field>
        </div>

        {testResult && (
          <div
            className={`mt-3 rounded-xl p-3 text-sm font-medium ${
              testResult.ok
                ? 'bg-fiber-emerald/15 text-fiber-emerald'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !isConfigComplete(config)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-fiber-border bg-fiber-card px-4 font-mono text-sm font-bold text-slate-200 transition-all duration-200 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Probar conexión
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-sm font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

interface AdminViewProps {
  editId?: string
}

export function AdminView({ editId }: AdminViewProps) {
  const [config, setConfig] = useState<GithubConfig>(() => loadConfig())
  const [showSettings, setShowSettings] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [loginSlot, setLoginSlot] = useState<ImageSlot>(emptySlot)
  const [deviceSlot, setDeviceSlot] = useState<ImageSlot>(emptySlot)

  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [aliasesText, setAliasesText] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [defaultIp, setDefaultIp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')

  const [manuals, setManuals] = useState<ManualDraft[]>([{ label: '', url: '' }])

  const [enableChecklist, setEnableChecklist] = useState(false)
  const [steps, setSteps] = useState<StepDraft[]>([
    { title: '', description: '', checklistText: '' },
  ])

  const [actionMode, setActionMode] = useState<ActionMode>('manual')
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle')
  const [publishMessage, setPublishMessage] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)

  const promptTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (promptTimerRef.current !== null) window.clearTimeout(promptTimerRef.current)
    }
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setBrand('')
    setModel('')
    setAliasesText('')
    setSlug('')
    setSlugTouched(false)
    setDefaultIp('')
    setUsername('')
    setPassword('')
    setNotes('')
    setManuals([{ label: '', url: '' }])
    setEnableChecklist(false)
    setSteps([{ title: '', description: '', checklistText: '' }])
    setLoginSlot(emptySlot())
    setDeviceSlot(emptySlot())
    setPublishStatus('idle')
    setPublishMessage('')
  }

  const loadOnu = (onu: ONU) => {
    setEditingId(onu.id)
    setBrand(onu.brand)
    setModel(onu.model)
    setAliasesText(onu.aliases.join(', '))
    setSlug(onu.id)
    setSlugTouched(true)
    setDefaultIp(onu.defaultIp)
    setUsername(onu.credentials.username)
    setPassword(onu.credentials.password)
    setNotes(onu.notes ?? '')

    const legacyManuals = onu.legacyManuals ?? []
    setManuals(
      legacyManuals.length > 0
        ? legacyManuals.map((manual) => ({ label: manual.label, url: manual.url }))
        : [{ label: '', url: '' }],
    )

    const hasSteps = Boolean(onu.interactiveManual && onu.interactiveManual.length > 0)
    setEnableChecklist(hasSteps)
    setSteps(
      hasSteps && onu.interactiveManual
        ? onu.interactiveManual.map((step) => ({
            title: step.title,
            description: step.description,
            checklistText: (step.checklist ?? []).join('\n'),
          }))
        : [{ title: '', description: '', checklistText: '' }],
    )

    setLoginSlot({
      file: null,
      blob: null,
      preview: onu.loginUiImage || null,
      sizeKb: null,
      error: null,
      existingPath: onu.loginUiImage || null,
    })
    setDeviceSlot({
      file: null,
      blob: null,
      preview: onu.deviceImage || null,
      sizeKb: null,
      error: null,
      existingPath: onu.deviceImage || null,
    })

    setPublishStatus('idle')
    setPublishMessage('')
  }

  useEffect(() => {
    if (editId) {
      const onu = getOnuById(editId)
      if (onu) loadOnu(onu)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const processImage = async (file: File, setSlot: Dispatch<SetStateAction<ImageSlot>>) => {
    if (!file.type.startsWith('image/')) {
      setSlot((prev) => ({ ...prev, error: 'El archivo seleccionado no es una imagen.' }))
      return
    }
    try {
      const compressed = await compressImage(file)
      setSlot((prev) => ({
        ...prev,
        file,
        blob: compressed.blob,
        preview: compressed.previewUrl,
        sizeKb: compressed.sizeKb,
        error: null,
      }))
    } catch {
      setSlot((prev) => ({ ...prev, error: 'No se pudo procesar la imagen.' }))
    }
  }

  const currentId = slug.trim() || slugify(`${brand}-${model}`) || 'nueva-onu'

  const manualRowsValid = manuals.every((manual) => {
    const label = manual.label.trim()
    const url = manual.url.trim()
    if (label === '' && url === '') return true
    if (label === '' || url === '') return false
    return /^https?:\/\//i.test(url)
  })

  const requiredOk =
    brand.trim() !== '' &&
    model.trim() !== '' &&
    username.trim() !== '' &&
    password.trim() !== '' &&
    manualRowsValid

  const handleModeChange = (value: string) => {
    if (value === '') {
      resetForm()
      return
    }
    const onu = getOnuById(value)
    if (onu) loadOnu(onu)
  }

  const handleBrandChange = (value: string) => {
    setBrand(value)
    if (!slugTouched) setSlug(slugify(`${value}-${model}`))
  }

  const handleModelChange = (value: string) => {
    setModel(value)
    if (!slugTouched) setSlug(slugify(`${brand}-${value}`))
  }

  const handleSlugChange = (value: string) => {
    setSlugTouched(true)
    setSlug(value)
  }

  const addManual = () => setManuals((prev) => [...prev, { label: '', url: '' }])

  const updateManual = (index: number, patch: Partial<ManualDraft>) => {
    setManuals((prev) => prev.map((manual, i) => (i === index ? { ...manual, ...patch } : manual)))
  }

  const removeManual = (index: number) => {
    setManuals((prev) => prev.filter((_, i) => i !== index))
  }

  const addStep = () =>
    setSteps((prev) => [...prev, { title: '', description: '', checklistText: '' }])

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const buildOnu = (): ONU | null => {
    const trimmedBrand = brand.trim()
    const trimmedModel = model.trim()
    const trimmedUsername = username.trim()

    if (
      trimmedBrand === '' ||
      trimmedModel === '' ||
      trimmedUsername === '' ||
      password.trim() === ''
    ) {
      return null
    }

    const id = slug.trim() || slugify(`${trimmedBrand}-${trimmedModel}`)

    const legacyManuals: LegacyManualLink[] = manuals
      .map((manual) => ({ label: manual.label.trim(), url: manual.url.trim() }))
      .filter((manual) => manual.label !== '' && manual.url !== '')

    const interactiveManual: ManualStep[] | undefined = enableChecklist
      ? steps
          .map((step, index) => ({
            stepNumber: index + 1,
            title: step.title.trim(),
            description: step.description.trim(),
            checklist: parseLines(step.checklistText),
          }))
          .filter((step) => step.title !== '')
      : undefined

    const deviceImage = deviceSlot.file
      ? `images/onus/${id}-device.webp`
      : (deviceSlot.existingPath ?? undefined)

    return {
      id,
      brand: trimmedBrand,
      model: trimmedModel,
      aliases: parseList(aliasesText),
      defaultIp: defaultIp.trim(),
      credentials: { username: trimmedUsername, password },
      loginUiImage: loginSlot.file
        ? `images/onus/${id}-login.webp`
        : (loginSlot.existingPath ?? ''),
      deviceImage,
      legacyManuals: legacyManuals.length > 0 ? legacyManuals : undefined,
      interactiveManual:
        interactiveManual && interactiveManual.length > 0 ? interactiveManual : undefined,
      notes: notes.trim() || undefined,
    }
  }

  const handleDownloadFile = () => {
    const onu = buildOnu()
    if (!onu) {
      setPublishStatus('error')
      setPublishMessage(
        'Completa Marca, Modelo, Usuario, Contraseña y revisa los enlaces de manual (Etiqueta + URL).',
      )
      return
    }

    const updated = editingId
      ? ONUS.map((existing) => (existing.id === editingId ? onu : existing))
      : [...ONUS, onu]

    downloadBlob(
      new Blob([serializeOnusFile(updated)], { type: 'text/plain;charset=utf-8' }),
      'onus.ts',
    )

    setPublishStatus('success')
    setPublishMessage(
      'onus.ts descargado. Reemplaza src/data/onus.ts con este archivo y haz push. Si subiste imágenes nuevas, descárgalas y guárdalas en public/images/onus/.',
    )
  }

  const handleCopyPrompt = async () => {
    const onu = buildOnu()
    if (!onu) {
      setPublishStatus('error')
      setPublishMessage(
        'Completa Marca, Modelo, Usuario, Contraseña y revisa los enlaces de manual (Etiqueta + URL).',
      )
      return
    }

    const prompt = [
      'Actualiza esta ONU en onus.ts y haz push.',
      '',
      'Inserta o reemplaza el siguiente objeto dentro del arreglo ONUS de src/data/onus.ts:',
      '',
      '```ts',
      JSON.stringify(onu, null, 2),
      '```',
      '',
    ].join('\n')

    const ok = await copyText(prompt)
    if (!ok) {
      setPublishStatus('error')
      setPublishMessage('No se pudo copiar al portapapeles.')
      return
    }

    setPromptCopied(true)
    if (promptTimerRef.current !== null) window.clearTimeout(promptTimerRef.current)
    promptTimerRef.current = window.setTimeout(() => setPromptCopied(false), 2500)

    setPublishStatus('success')
    setPublishMessage('Prompt copiado. Pégalo en OpenCode para actualizar onus.ts y hacer push.')
  }

  const handlePublish = async () => {
    const onu = buildOnu()
    if (!onu) {
      setPublishStatus('error')
      setPublishMessage('Completa los campos obligatorios y revisa los enlaces de manual.')
      return
    }

    if (!isConfigComplete(config)) {
      setShowSettings(true)
      setPublishStatus('idle')
      return
    }

    saveConfig(config)

    try {
      let loginBase64: string | undefined
      let deviceBase64: string | undefined

      if (loginSlot.file) {
        setPublishStatus('compressing')
        setPublishMessage('Comprimiendo imagen de interfaz...')
        loginBase64 = (await compressImage(loginSlot.file)).base64
      }

      if (deviceSlot.file) {
        setPublishStatus('compressing')
        setPublishMessage('Comprimiendo foto del equipo...')
        deviceBase64 = (await compressImage(deviceSlot.file)).base64
      }

      setPublishStatus('uploading')
      setPublishMessage('Subiendo a GitHub...')

      const images = { login: loginBase64, device: deviceBase64 }

      if (editingId) {
        await updateExistingOnu(onu, images)
      } else {
        await publishNewOnu(onu, images)
      }

      setPublishStatus('success')
      setPublishMessage(
        editingId
          ? '¡Actualizado con éxito! GitHub Actions actualizará la web en 1 minuto.'
          : '¡Publicado con éxito! GitHub Actions actualizará la web en 1 minuto.',
      )
    } catch (error) {
      setPublishStatus('error')
      setPublishMessage(error instanceof Error ? error.message : 'Ocurrió un error al publicar.')
    }
  }

  const isWorking = publishStatus === 'compressing' || publishStatus === 'uploading'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="#/"
          className="flex w-fit items-center gap-2 rounded-xl border border-fiber-border bg-fiber-card px-4 py-2.5 font-mono text-sm font-bold text-slate-200 transition-all duration-200 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al Catálogo
        </a>

        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-xl border border-fiber-border bg-fiber-card px-4 py-2.5 font-mono text-sm font-bold text-slate-200 transition-all duration-200 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Configuración GitHub
        </button>
      </div>

      {/* Selector de modo */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="admin-mode"
          className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-slate-500"
        >
          Modo
        </label>
        <select
          id="admin-mode"
          value={editingId ?? ''}
          onChange={(event) => handleModeChange(event.target.value)}
          className={inputClass}
        >
          <option value="">+ Crear nueva ONU / Manual</option>
          {ONUS.map((onu) => (
            <option key={onu.id} value={onu.id}>
              Editar: {onu.brand} {onu.model} ({onu.id})
            </option>
          ))}
        </select>
      </div>

      {/* Datos principales */}
      <section className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
        <h2 className="mb-3 font-mono text-base font-bold uppercase tracking-wide text-slate-50">Datos principales</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Marca" required>
            <input
              type="text"
              value={brand}
              onChange={(event) => handleBrandChange(event.target.value)}
              placeholder="VSOL"
              className={inputClass}
            />
          </Field>

          <Field label="Modelo" required>
            <input
              type="text"
              value={model}
              onChange={(event) => handleModelChange(event.target.value)}
              placeholder="V2801"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <Field label="Alias (separados por coma)">
            <input
              type="text"
              value={aliasesText}
              onChange={(event) => setAliasesText(event.target.value)}
              placeholder="Bestcom, C-Data, Fenix"
              className={inputClass}
            />
          </Field>

          <Field label={editingId ? 'ID de la ONU (no editable)' : 'ID de la ONU (slug)'}>
            <input
              type="text"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="vsol-v2801"
              disabled={editingId !== null}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </Field>

          <Field label="IP por defecto">
            <input
              type="text"
              value={defaultIp}
              onChange={(event) => setDefaultIp(event.target.value)}
              placeholder="192.168.1.1"
              inputMode="decimal"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Usuario" required>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="off"
              className={inputClass}
            />
          </Field>

          <Field label="Contraseña" required>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Notas técnicas">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Requiere reiniciar tras cambiar VLAN"
              rows={2}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      </section>

      {/* Imágenes (login + equipo físico) */}
      <section className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
        <h2 className="mb-3 font-mono text-base font-bold uppercase tracking-wide text-slate-50">Imágenes del equipo</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageDropzone
            title="🖥️ Captura de login"
            hint="Arrastra o selecciona la pantalla de login"
            targetName={`images/onus/${currentId}-login.webp`}
            slot={loginSlot}
            onFile={(file) => void processImage(file, setLoginSlot)}
            onClear={() => setLoginSlot(emptySlot())}
          />
          <ImageDropzone
            title="📦 Foto física de la ONU"
            hint="Arrastra o selecciona una foto del equipo"
            targetName={`images/onus/${currentId}-device.webp`}
            slot={deviceSlot}
            onFile={(file) => void processImage(file, setDeviceSlot)}
            onClear={() => setDeviceSlot(emptySlot())}
          />
        </div>
      </section>

      {/* Enlaces de manuales */}
      <section className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
        <h2 className="mb-1 font-mono text-base font-bold uppercase tracking-wide text-slate-50">Enlaces de Manuales (Drive/PDF)</h2>
        <p className="mb-3 font-mono text-xs text-slate-400">
          Cada enlace necesita <strong className="text-fiber-cyan">Etiqueta</strong> y{' '}
          <strong className="text-fiber-cyan">URL</strong>. Deja la fila vacía si no aplica.
        </p>

        <div className="flex flex-col gap-3">
          {manuals.map((manual, index) => {
            const label = manual.label.trim()
            const url = manual.url.trim()
            const partiallyFilled = (label === '') !== (url === '')
            const invalidUrl = url !== '' && !/^https?:\/\//i.test(url)

            return (
              <div
                key={index}
                className="rounded-xl border border-fiber-border bg-fiber-dark/50 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-fiber-cyan">
                    Enlace {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeManual(index)}
                    disabled={manuals.length === 1}
                    aria-label={`Quitar enlace ${index + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <Field label="Etiqueta / Nombre">
                    <input
                      type="text"
                      value={manual.label}
                      onChange={(event) => updateManual(index, { label: event.target.value })}
                      placeholder="Manual de Configuración"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Enlace URL">
                    <input
                      type="url"
                      value={manual.url}
                      onChange={(event) => updateManual(index, { url: event.target.value })}
                      placeholder="https://drive.google.com/..."
                      className={inputClass}
                    />
                  </Field>
                </div>

                {partiallyFilled && (
                  <p className="mt-2 font-mono text-[11px] font-medium text-fiber-amber">
                    Completa la etiqueta y la URL, o deja la fila vacía.
                  </p>
                )}
                {invalidUrl && (
                  <p className="mt-1 font-mono text-[11px] font-medium text-red-400">
                    La URL debe empezar por http:// o https://.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addManual}
          className="mt-3 flex items-center gap-1.5 rounded-xl px-2 py-1.5 font-mono text-sm font-bold text-fiber-cyan transition-colors hover:text-fiber-teal"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar otro enlace
        </button>
      </section>

      {/* Constructor de checklist */}
      <section className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-mono text-base font-bold uppercase tracking-wide text-slate-50">Checklist interactivo</h2>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-sm font-semibold text-slate-300">Crear paso a paso</span>
            <input
              type="checkbox"
              checked={enableChecklist}
              onChange={(event) => setEnableChecklist(event.target.checked)}
              className="peer sr-only"
            />
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${
                enableChecklist ? 'bg-fiber-emerald' : 'bg-fiber-border'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-slate-100 transition-transform ${
                  enableChecklist ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </label>
        </div>

        {enableChecklist && (
          <div className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="rounded-xl border border-fiber-border bg-fiber-dark/50 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-fiber-cyan">
                    Paso {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={steps.length === 1}
                    aria-label={`Quitar paso ${index + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(event) => updateStep(index, { title: event.target.value })}
                    placeholder="Título del paso"
                    aria-label={`Título del paso ${index + 1}`}
                    className={inputClass}
                  />
                  <textarea
                    value={step.description}
                    onChange={(event) => updateStep(index, { description: event.target.value })}
                    placeholder="Descripción del paso"
                    aria-label={`Descripción del paso ${index + 1}`}
                    rows={2}
                    className={`${inputClass} resize-y`}
                  />
                  <textarea
                    value={step.checklistText}
                    onChange={(event) => updateStep(index, { checklistText: event.target.value })}
                    placeholder={'Sub-items a verificar (uno por línea)\nConectar cable LAN1\nConfigurar VLAN 100'}
                    aria-label={`Sub-items del paso ${index + 1}`}
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addStep}
              className="flex w-fit items-center gap-1.5 rounded-xl px-2 py-1.5 font-mono text-sm font-bold text-fiber-cyan transition-colors hover:text-fiber-teal"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar paso
            </button>
          </div>
        )}
      </section>

      {/* Estado y acciones */}
      <section className="flex flex-col gap-3">
        {publishStatus !== 'idle' && (
          <div
            className={`flex items-start gap-2 rounded-xl p-3 text-sm font-medium ${
              publishStatus === 'success'
                ? 'bg-fiber-emerald/15 text-fiber-emerald'
                : publishStatus === 'error'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-fiber-cardHover text-slate-300'
            }`}
            role="status"
            aria-live="polite"
          >
            {publishStatus === 'success' && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {publishStatus === 'error' && (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {isWorking && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
            <span>{publishMessage}</span>
          </div>
        )}

        {!requiredOk && (
          <p className="font-mono text-xs font-medium text-slate-400">
            Completa los campos obligatorios (*): Marca, Modelo, Usuario y Contraseña. Los enlaces
            de manual deben tener Etiqueta + URL (o estar vacíos).
          </p>
        )}

        {/* Pestañas de acción */}
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-fiber-border bg-fiber-dark p-1">
          <button
            type="button"
            onClick={() => setActionMode('manual')}
            className={`min-h-[40px] rounded-lg px-2 font-mono text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
              actionMode === 'manual'
                ? 'bg-fiber-teal text-fiber-dark shadow-cyan-glow'
                : 'text-slate-500 hover:text-fiber-cyan'
            }`}
          >
            Guardar local
          </button>
          <button
            type="button"
            onClick={() => setActionMode('advanced')}
            className={`min-h-[40px] rounded-lg px-2 font-mono text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
              actionMode === 'advanced'
                ? 'bg-fiber-teal text-fiber-dark shadow-cyan-glow'
                : 'text-slate-500 hover:text-fiber-cyan'
            }`}
          >
            Avanzado: Push por API
          </button>
        </div>

        {actionMode === 'manual' ? (
          <>
            <button
              type="button"
              onClick={handleDownloadFile}
              disabled={!requiredOk}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-base font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">💾</span>
              Descargar archivo onus.ts
            </button>

            <button
              type="button"
              onClick={handleCopyPrompt}
              disabled={!requiredOk}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-fiber-border bg-fiber-card px-5 font-mono text-sm font-bold text-slate-200 transition-all duration-200 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">{promptCopied ? '✅' : '📋'}</span>
              {promptCopied ? 'Prompt copiado' : 'Copiar Código para OpenCode'}
            </button>

            <p className="font-mono text-xs leading-relaxed text-slate-500">
              Reemplaza <code className="font-mono text-fiber-cyan/90">src/data/onus.ts</code> con el archivo
              descargado y haz push. Si subiste imágenes nuevas, descárgalas desde cada miniatura y
              guárdalas en <code className="font-mono text-fiber-cyan/90">public/images/onus/</code>.
            </p>
          </>
        ) : (
          <>
            {!isConfigComplete(config) && (
              <div className="flex items-start gap-2 rounded-xl border border-fiber-amber/25 bg-fiber-amber/10 p-3 text-fiber-amber">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">
                  El push directo necesita un token de GitHub. Si prefieres no configurarlo, usa la
                  pestaña “Guardar local”.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handlePublish}
              disabled={!requiredOk || isWorking}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-base font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWorking ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <span aria-hidden="true">{editingId ? '✏️' : '🚀'}</span>
              )}
              {editingId ? 'Actualizar en GitHub' : 'Publicar en GitHub'}
            </button>

            <p className="font-mono text-xs leading-relaxed text-slate-500">
              Sube las imágenes y hace commit directo en <code className="font-mono text-fiber-cyan/90">{config.branch || 'main'}</code>.
            </p>
          </>
        )}
      </section>

      {showSettings && (
        <SettingsModal
          config={config}
          onChange={setConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
