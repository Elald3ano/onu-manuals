import { useEffect, useRef, useState } from 'react'
import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  FormEvent,
  ReactNode,
  SetStateAction,
} from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  CloudOff,
  ImagePlus,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import type { ONU, LegacyManualLink, ManualStep } from '../types/onu'
import { compressImage } from '../utils/imageCompressor'
import { saveOnu } from '../services/onuService'
import type { StepImageUpload } from '../services/onuService'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { isSupabaseConfigured } from '../lib/supabase'

type SaveStatus = 'idle' | 'photos' | 'record' | 'success' | 'error'

interface ManualDraft {
  label: string
  url: string
}

interface ImageSlot {
  file: File | null
  blob: Blob | null
  preview: string | null
  sizeKb: number | null
  error: string | null
  existingPath: string | null
}

interface StepDraft {
  title: string
  description: string
  checklistText: string
  slot: ImageSlot
}

interface BuiltOnu {
  onu: ONU
  stepImages: StepImageUpload[]
}

const inputClass =
  'w-full rounded-xl border border-fiber-border bg-fiber-dark/60 px-3 py-2.5 font-mono text-base text-slate-100 placeholder:text-slate-500 transition-colors focus:border-fiber-teal focus:outline-none focus:ring-2 focus:ring-fiber-teal/30'

function emptySlot(): ImageSlot {
  return { file: null, blob: null, preview: null, sizeKb: null, error: null, existingPath: null }
}

function emptyStep(): StepDraft {
  return { title: '', description: '', checklistText: '', slot: emptySlot() }
}

/** Libera únicamente previews locales; nunca revoca URLs remotas. */
function releasePreview(slot: ImageSlot): void {
  if (slot.preview?.startsWith('blob:')) URL.revokeObjectURL(slot.preview)
}

/** Descarga la versión WebP comprimida que se muestra en el formulario. */
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
  compact = false,
}: {
  title: string
  hint: string
  targetName: string
  slot: ImageSlot
  onFile: (file: File) => void
  onClear: () => void
  compact?: boolean
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
            <img
              src={slot.preview}
              alt={title}
              className={`${compact ? 'h-28' : 'h-36'} w-full object-contain`}
            />
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
          {compact && (
            <button
              type="button"
              onClick={onClear}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 font-mono text-xs font-bold text-red-300 transition-colors hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Quitar captura
            </button>
          )}
          <p className="font-mono text-[11px] font-medium text-slate-400">
            {slot.sizeKb !== null ? `Comprimido: ${slot.sizeKb} KB en WebP` : 'Imagen actual'}
            {slot.file ? ' · nueva' : ''}
          </p>
          <p className="font-mono text-[11px] text-slate-500">
            Se subirá a{' '}
            <code className="break-all font-mono text-fiber-cyan/90">{targetName}</code>
          </p>
          {blob && !compact && (
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
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors ${
            compact ? 'p-3' : 'p-6'
          } ${
            dragging
              ? 'border-fiber-cyan bg-fiber-teal/10 shadow-cyan-glow'
              : 'border-fiber-border bg-fiber-dark/40 hover:border-fiber-teal/60'
          }`}
        >
          <ImagePlus
            className={`${compact ? 'h-5 w-5' : 'h-7 w-7'} text-fiber-teal/60`}
            aria-hidden="true"
          />
          <p
            className={`font-mono ${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-slate-300`}
          >
            {hint}
          </p>
          <p
            className={`font-mono ${compact ? 'text-[10px]' : 'text-[11px]'} text-slate-500`}
          >
            PNG / JPG · se optimiza a WebP
          </p>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleInput} className="hidden" />

      {slot.error && <p className="text-xs font-medium text-red-400">{slot.error}</p>}
    </div>
  )
}

interface AdminViewProps {
  editId?: string
  onus: ONU[]
  loading?: boolean
  onSaved: (onu: ONU) => void
}

export function AdminView({
  editId,
  onus,
  loading: catalogLoading = false,
  onSaved,
}: AdminViewProps) {
  const { session, loading: authLoading, signIn, signOut } = useSupabaseAuth()
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
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
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()])

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  const loadedEditIdRef = useRef<string | null>(null)

  const releaseCurrentPreviews = () => {
    releasePreview(loginSlot)
    releasePreview(deviceSlot)
    steps.forEach((step) => releasePreview(step.slot))
  }

  const resetForm = () => {
    releaseCurrentPreviews()
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
    setSteps([emptyStep()])
    setLoginSlot(emptySlot())
    setDeviceSlot(emptySlot())
    setSaveStatus('idle')
    setSaveMessage('')
  }

  const loadOnu = (onu: ONU) => {
    releaseCurrentPreviews()
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
            slot: {
              file: null,
              blob: null,
              preview: step.screenshot ?? null,
              sizeKb: null,
              error: null,
              existingPath: step.screenshot ?? null,
            },
          }))
        : [emptyStep()],
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

    setSaveStatus('idle')
    setSaveMessage('')
  }

  useEffect(() => {
    if (!editId) {
      loadedEditIdRef.current = null
      return
    }
    if (loadedEditIdRef.current === editId) return
    const onu = onus.find((item) => item.id === editId)
    if (!onu) return
    loadOnu(onu)
    loadedEditIdRef.current = editId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, onus])

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

  const processStepImage = (index: number, file: File) => {
    void processImage(file, (action) => {
      setSteps((prev) =>
        prev.map((step, i) => {
          if (i !== index) return step
          const nextSlot = typeof action === 'function' ? action(step.slot) : action
          return { ...step, slot: nextSlot }
        }),
      )
    })
  }

  const clearStepSlot = (index: number) => {
    const target = steps[index]
    if (target) releasePreview(target.slot)
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, slot: emptySlot() } : step)),
    )
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
    const onu = onus.find((item) => item.id === value)
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

  const addStep = () => setSteps((prev) => [...prev, emptyStep()])

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }

  const removeStep = (index: number) => {
    const target = steps[index]
    if (target) releasePreview(target.slot)
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const buildOnu = (): BuiltOnu | null => {
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

    const interactiveManual: ManualStep[] = []
    const stepImages: StepImageUpload[] = []

    if (enableChecklist) {
      steps.forEach((step) => {
        const title = step.title.trim()
        if (title === '') return

        const stepNumber = interactiveManual.length + 1
        interactiveManual.push({
          stepNumber,
          title,
          description: step.description.trim(),
          checklist: parseLines(step.checklistText),
          screenshot: step.slot.file ? undefined : (step.slot.existingPath ?? undefined),
        })

        if (step.slot.file) {
          stepImages.push({ stepNumber, file: step.slot.file })
        }
      })
    }

    const deviceImage = deviceSlot.file
      ? `images/onus/${id}-device.webp`
      : (deviceSlot.existingPath ?? undefined)

    return {
      onu: {
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
        interactiveManual: interactiveManual.length > 0 ? interactiveManual : undefined,
        notes: notes.trim() || undefined,
      },
      stepImages,
    }
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthSubmitting(true)
    try {
      await signIn(authEmail.trim(), authPassword)
      setAuthPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setAuthError('')
    try {
      await signOut()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo cerrar sesión.')
    }
  }

  const handleSaveOnu = async () => {
    const built = buildOnu()
    if (!built) {
      setSaveStatus('error')
      setSaveMessage('Completa los campos obligatorios y revisa los enlaces de manual.')
      return
    }

    const { onu, stepImages } = built

    if (!session) {
      setSaveStatus('error')
      setSaveMessage('Inicia sesión como administrador para guardar en Supabase.')
      return
    }

    if (!editingId && onus.some((item) => item.id === onu.id)) {
      setSaveStatus('error')
      setSaveMessage(
        `Ya existe una ONU con el ID "${onu.id}". Cambia el slug o edita la existente.`,
      )
      return
    }

    const hasImages = Boolean(loginSlot.file || deviceSlot.file || stepImages.length > 0)

    try {
      setSaveStatus(hasImages ? 'photos' : 'record')
      setSaveMessage(hasImages ? 'Subiendo imágenes a Supabase...' : 'Guardando registro...')

      const saved = await saveOnu(
        onu,
        loginSlot.file ?? undefined,
        deviceSlot.file ?? undefined,
        stepImages,
        (stage) => {
          if (stage === 'photos') {
            setSaveStatus('photos')
            setSaveMessage('Subiendo imágenes a Supabase...')
          } else {
            setSaveStatus('record')
            setSaveMessage('Guardando registro...')
          }
        },
      )

      releaseCurrentPreviews()
      onSaved(saved)
      setEditingId(saved.id)
      setSlug(saved.id)
      setSlugTouched(true)
      setLoginSlot({
        file: null,
        blob: null,
        preview: saved.loginUiImage || null,
        sizeKb: null,
        error: null,
        existingPath: saved.loginUiImage || null,
      })
      setDeviceSlot({
        file: null,
        blob: null,
        preview: saved.deviceImage ?? null,
        sizeKb: null,
        error: null,
        existingPath: saved.deviceImage ?? null,
      })

      if (saved.interactiveManual && saved.interactiveManual.length > 0) {
        setSteps(
          saved.interactiveManual.map((step) => ({
            title: step.title,
            description: step.description,
            checklistText: (step.checklist ?? []).join('\n'),
            slot: {
              file: null,
              blob: null,
              preview: step.screenshot ?? null,
              sizeKb: null,
              error: null,
              existingPath: step.screenshot ?? null,
            },
          })),
        )
        setEnableChecklist(true)
      } else {
        setSteps([emptyStep()])
        setEnableChecklist(false)
      }

      setSaveStatus('success')
      setSaveMessage('¡Guardado con éxito en Supabase! Ya está disponible en tiempo real.')
    } catch (error) {
      setSaveStatus('error')
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar en Supabase.')
    }
  }

  const isWorking = saveStatus === 'photos' || saveStatus === 'record'

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

        <div className="flex flex-wrap items-center gap-2">
          {session ? (
            <>
              <span className="flex items-center gap-1.5 rounded-xl border border-fiber-emerald/30 bg-fiber-emerald/10 px-3 py-2 font-mono text-xs font-bold text-fiber-emerald">
                <Cloud className="h-4 w-4" aria-hidden="true" />
                <span className="max-w-[180px] truncate">{session.user.email ?? 'admin'}</span>
              </span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex items-center gap-2 rounded-xl border border-fiber-border bg-fiber-card px-3 py-2 font-mono text-sm font-bold text-slate-200 transition-all duration-200 hover:border-red-400/50 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Salir
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded-xl border border-fiber-border bg-fiber-card px-3 py-2 font-mono text-xs font-bold text-slate-400">
              <CloudOff className="h-4 w-4" aria-hidden="true" />
              Sin sesión
            </span>
          )}
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 rounded-2xl border border-fiber-amber/25 bg-fiber-amber/10 p-4 text-fiber-amber">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-mono text-sm font-bold uppercase tracking-wide">
              Supabase no configurado
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              Define <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> en{' '}
              <code className="font-mono">.env</code> y vuelve a compilar. Mientras tanto, solo está
              disponible el respaldo local.
            </p>
          </div>
        </div>
      )}

      {isSupabaseConfigured && authLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-fiber-border bg-fiber-card/60 px-3 py-2 font-mono text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-fiber-cyan" aria-hidden="true" />
          Comprobando sesión…
        </div>
      )}

      {isSupabaseConfigured && !authLoading && !session && (
        <section className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
          <div className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-fiber-cyan" aria-hidden="true" />
            <h2 className="font-mono text-base font-bold uppercase tracking-wide text-slate-50">
              Acceso administrador
            </h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Inicia sesión con tu usuario de Supabase para guardar cambios y subir fotos. La lectura
            del catálogo sigue siendo pública.
          </p>
          <form onSubmit={(event) => void handleSignIn(event)} className="mt-3 flex flex-col gap-3">
            <Field label="Email" required>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="admin@tu-dominio.com"
                autoComplete="username"
                className={inputClass}
              />
            </Field>
            <Field label="Contraseña" required>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={inputClass}
              />
            </Field>
            {authError && (
              <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authSubmitting || authEmail.trim() === '' || authPassword === ''}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-sm font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              Iniciar sesión
            </button>
          </form>
        </section>
      )}

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
          {onus.map((onu) => (
            <option key={onu.id} value={onu.id}>
              Editar: {onu.brand} {onu.model} ({onu.id})
            </option>
          ))}
        </select>
        {catalogLoading && (
          <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-500">
            <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
            Actualizando catálogo…
          </p>
        )}
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
            targetName={`onu-images/${currentId}-login.webp`}
            slot={loginSlot}
            onFile={(file) => void processImage(file, setLoginSlot)}
            onClear={() => {
              releasePreview(loginSlot)
              setLoginSlot(emptySlot())
            }}
          />
          <ImageDropzone
            title="📦 Foto física de la ONU"
            hint="Arrastra o selecciona una foto del equipo"
            targetName={`onu-images/${currentId}-device.webp`}
            slot={deviceSlot}
            onFile={(file) => void processImage(file, setDeviceSlot)}
            onClear={() => {
              releasePreview(deviceSlot)
              setDeviceSlot(emptySlot())
            }}
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

                  <div className="mt-1 rounded-xl border border-fiber-border/70 bg-fiber-dark/40 p-3">
                    <ImageDropzone
                      title={`Captura del paso ${index + 1} (opcional)`}
                      hint="Arrastrar o seleccionar captura para este paso"
                      targetName={`onu-images/steps/${currentId}-step-${index + 1}.webp`}
                      slot={step.slot}
                      onFile={(file) => processStepImage(index, file)}
                      onClear={() => clearStepSlot(index)}
                      compact
                    />
                    {step.slot.preview && step.title.trim() === '' && (
                      <p className="mt-2 font-mono text-[11px] font-medium text-fiber-amber">
                        Agrega un título para guardar este paso y su captura.
                      </p>
                    )}
                  </div>
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
        {saveStatus !== 'idle' && (
          <div
            className={`flex items-start gap-2 rounded-xl p-3 text-sm font-medium ${
              saveStatus === 'success'
                ? 'bg-fiber-emerald/15 text-fiber-emerald'
                : saveStatus === 'error'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-fiber-cardHover text-slate-300'
            }`}
            role="status"
            aria-live="polite"
          >
            {saveStatus === 'success' && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {saveStatus === 'error' && (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {isWorking && (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            )}
            <span>{saveMessage}</span>
          </div>
        )}

        {!requiredOk && (
          <p className="font-mono text-xs font-medium text-slate-400">
            Completa los campos obligatorios (*): Marca, Modelo, Usuario y Contraseña. Los enlaces
            de manual deben tener Etiqueta + URL (o estar vacíos).
          </p>
        )}

        {isSupabaseConfigured && !session && (
          <p className="font-mono text-xs font-medium text-fiber-amber">
            Inicia sesión como administrador para guardar en Supabase.
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSaveOnu()}
          disabled={!requiredOk || isWorking || !session || !isSupabaseConfigured}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-base font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isWorking ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Cloud className="h-5 w-5" aria-hidden="true" />
          )}
          {isWorking
            ? saveStatus === 'photos'
              ? 'Subiendo imágenes…'
              : 'Guardando…'
            : 'Guardar en Supabase'}
        </button>

        {saveStatus === 'success' && (
          <a
            href="#/"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-fiber-emerald/40 bg-fiber-emerald/10 px-5 font-mono text-sm font-bold text-fiber-emerald transition-colors hover:bg-fiber-emerald/20"
          >
            Ver catálogo actualizado
          </a>
        )}
      </section>
    </div>
  )
}
