import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode } from 'react'
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

interface ManualDraft {
  label: string
  url: string
}

interface StepDraft {
  title: string
  description: string
  checklistText: string
}

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40'

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
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de GitHub"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-800 p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary-300" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-50">Configuración de GitHub</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-slate-400">
          El token se guarda solo en este dispositivo (localStorage). Requiere permiso{' '}
          <code className="text-slate-300">repo</code> o{' '}
          <code className="text-slate-300">contents:write</code>.
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
                ? 'bg-success-600/15 text-success-400'
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
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Probar conexión
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition-colors hover:bg-primary-500"
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
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null)

  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [aliasesText, setAliasesText] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [defaultIp, setDefaultIp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')

  const [manuals, setManuals] = useState<ManualDraft[]>([{ label: 'Manual 1', url: '' }])

  const [enableChecklist, setEnableChecklist] = useState(false)
  const [steps, setSteps] = useState<StepDraft[]>([
    { title: '', description: '', checklistText: '' },
  ])

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle')
  const [publishMessage, setPublishMessage] = useState('')
  const [jsonCopied, setJsonCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const jsonTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (jsonTimerRef.current !== null) window.clearTimeout(jsonTimerRef.current)
    }
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setExistingImagePath(null)
    setBrand('')
    setModel('')
    setAliasesText('')
    setSlug('')
    setSlugTouched(false)
    setDefaultIp('')
    setUsername('')
    setPassword('')
    setNotes('')
    setManuals([{ label: 'Manual 1', url: '' }])
    setEnableChecklist(false)
    setSteps([{ title: '', description: '', checklistText: '' }])
    setImageFile(null)
    setImagePreview(null)
    setImageSizeKb(null)
    setImageError(null)
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
        : [{ label: 'Manual 1', url: '' }],
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

    setImageFile(null)
    setExistingImagePath(onu.loginUiImage || null)
    setImagePreview(onu.loginUiImage || null)
    setImageSizeKb(null)
    setImageError(null)
    setPublishStatus('idle')
    setPublishMessage('')
  }

  useEffect(() => {
    if (editId) {
      const onu = getOnuById(editId)
      if (onu) loadOnu(onu)
    }
    // Solo reaccionamos al cambio del parámetro de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const requiredOk =
    brand.trim() !== '' && model.trim() !== '' && username.trim() !== '' && password.trim() !== ''

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

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('El archivo seleccionado no es una imagen.')
      return
    }
    setImageError(null)
    try {
      const compressed = await compressImage(file)
      setImageFile(file)
      setImagePreview(compressed.previewUrl)
      setImageSizeKb(compressed.sizeKb)
    } catch {
      setImageError('No se pudo procesar la imagen.')
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
    event.target.value = ''
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageSizeKb(null)
    setImageError(null)
    setExistingImagePath(null)
  }

  const addManual = () => setManuals((prev) => [...prev, { label: '', url: '' }])

  const updateManual = (index: number, patch: Partial<ManualDraft>) => {
    setManuals((prev) => prev.map((manual, i) => (i === index ? { ...manual, ...patch } : manual)))
  }

  const removeManual = (index: number) => {
    setManuals((prev) => prev.filter((_, i) => i !== index))
  }

  const addStep = () => setSteps((prev) => [...prev, { title: '', description: '', checklistText: '' }])

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
      .filter((manual) => manual.url !== '')

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

    return {
      id,
      brand: trimmedBrand,
      model: trimmedModel,
      aliases: parseList(aliasesText),
      defaultIp: defaultIp.trim(),
      credentials: { username: trimmedUsername, password },
      loginUiImage: imageFile ? `images/onus/${id}-login.webp` : (existingImagePath ?? ''),
      legacyManuals: legacyManuals.length > 0 ? legacyManuals : undefined,
      interactiveManual:
        interactiveManual && interactiveManual.length > 0 ? interactiveManual : undefined,
      notes: notes.trim() || undefined,
    }
  }

  const handleCopyJson = async () => {
    const onu = buildOnu()
    if (!onu) {
      setPublishStatus('error')
      setPublishMessage('Completa los campos obligatorios: Marca, Modelo, Usuario y Contraseña.')
      return
    }

    const ok = await copyText(JSON.stringify(onu, null, 2))
    if (!ok) return

    setJsonCopied(true)
    if (jsonTimerRef.current !== null) window.clearTimeout(jsonTimerRef.current)
    jsonTimerRef.current = window.setTimeout(() => setJsonCopied(false), 1800)
  }

  const handlePublish = async () => {
    const onu = buildOnu()
    if (!onu) {
      setPublishStatus('error')
      setPublishMessage('Completa los campos obligatorios: Marca, Modelo, Usuario y Contraseña.')
      return
    }

    if (!isConfigComplete(config)) {
      setShowSettings(true)
      setPublishStatus('idle')
      return
    }

    // Aseguramos que el publicador lea la configuración actual desde localStorage.
    saveConfig(config)

    try {
      let imageBase64: string | undefined

      if (imageFile) {
        setPublishStatus('compressing')
        setPublishMessage('Comprimiendo imagen...')
        const compressed = await compressImage(imageFile)
        imageBase64 = compressed.base64
      }

      setPublishStatus('uploading')
      setPublishMessage('Subiendo a GitHub...')

      if (editingId) {
        await updateExistingOnu(onu, imageBase64)
      } else {
        await publishNewOnu(onu, imageBase64)
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

  const isPublishing = publishStatus === 'compressing' || publishStatus === 'uploading'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="#/"
          className="flex w-fit items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al Catálogo
        </a>

        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-100 transition-colors hover:border-slate-600 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Configuración GitHub
        </button>
      </div>

      {/* Selector de modo */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="admin-mode"
          className="text-xs font-bold uppercase tracking-wide text-slate-400"
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

      {!isConfigComplete(config) && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">
            Aún no has configurado GitHub. Pulsa “Configuración GitHub” para añadir tu token,
            usuario y repositorio antes de publicar.
          </p>
        </div>
      )}

      {/* Datos principales */}
      <section className="rounded-2xl border border-slate-700/60 bg-slate-800 p-4 shadow-lg">
        <h2 className="mb-3 text-base font-bold text-slate-50">Datos principales</h2>

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

      {/* Carga de imagen */}
      <section className="rounded-2xl border border-slate-700/60 bg-slate-800 p-4 shadow-lg">
        <h2 className="mb-3 text-base font-bold text-slate-50">Captura de login</h2>

        {imagePreview ? (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <img
                src={imagePreview}
                alt="Vista previa de la captura de login"
                className="h-44 w-full object-contain"
              />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Quitar imagen"
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-slate-100 transition-colors hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs font-medium text-slate-400">
              {imageSizeKb !== null
                ? `Comprimido: ${imageSizeKb} KB en WebP`
                : editingId
                  ? 'Imagen actual · arrastra una nueva para reemplazarla'
                  : 'Imagen lista para publicar'}
            </p>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-600/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
            }`}
          >
            <ImagePlus className="h-8 w-8 text-slate-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-300">
              Arrastra o selecciona la captura de login
            </p>
            <p className="text-xs text-slate-500">PNG / JPG · se optimiza a WebP automáticamente</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {imageError && (
          <p className="mt-2 text-xs font-medium text-red-400">{imageError}</p>
        )}
      </section>

      {/* Enlaces de manuales */}
      <section className="rounded-2xl border border-slate-700/60 bg-slate-800 p-4 shadow-lg">
        <h2 className="mb-3 text-base font-bold text-slate-50">Manuales existentes (Drive)</h2>

        <div className="flex flex-col gap-2">
          {manuals.map((manual, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={manual.label}
                onChange={(event) => updateManual(index, { label: event.target.value })}
                placeholder="Manual 1"
                aria-label={`Etiqueta del enlace ${index + 1}`}
                className={`${inputClass} w-32 shrink-0`}
              />
              <input
                type="url"
                value={manual.url}
                onChange={(event) => updateManual(index, { url: event.target.value })}
                placeholder="https://drive.google.com/…"
                aria-label={`URL del enlace ${index + 1}`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeManual(index)}
                disabled={manuals.length === 1}
                aria-label={`Quitar enlace ${index + 1}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addManual}
          className="mt-3 flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-primary-300 transition-colors hover:text-primary-200"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar otro enlace
        </button>
      </section>

      {/* Constructor de checklist */}
      <section className="rounded-2xl border border-slate-700/60 bg-slate-800 p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-50">Checklist interactivo</h2>
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
                enableChecklist ? 'bg-success-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
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
                className="rounded-xl border border-slate-700 bg-slate-900/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary-300">
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
              className="flex w-fit items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-primary-300 transition-colors hover:text-primary-200"
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
                ? 'bg-success-600/15 text-success-400'
                : publishStatus === 'error'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-slate-800 text-slate-300'
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
            {isPublishing && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
            <span>{publishMessage}</span>
          </div>
        )}

        {!requiredOk && (
          <p className="text-xs font-medium text-slate-400">
            Completa los campos obligatorios (*): Marca, Modelo, Usuario y Contraseña.
          </p>
        )}

        <button
          type="button"
          onClick={handlePublish}
          disabled={!requiredOk || isPublishing}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-base font-bold text-white shadow-lg shadow-primary-600/30 transition-colors hover:bg-primary-500 active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPublishing ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{editingId ? '✏️' : '🚀'}</span>
          )}
          {editingId ? 'Actualizar en GitHub' : 'Publicar en GitHub'}
        </button>

        <button
          type="button"
          onClick={handleCopyJson}
          disabled={!requiredOk}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-5 text-sm font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {jsonCopied ? (
            <CheckCircle2 className="h-4 w-4 text-success-400" aria-hidden="true" />
          ) : (
            <span aria-hidden="true">📋</span>
          )}
          {jsonCopied ? '¡JSON copiado!' : 'Copiar Objeto JSON'}
        </button>
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
