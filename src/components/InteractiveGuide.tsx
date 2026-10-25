import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Maximize2, RotateCcw, X } from 'lucide-react'
import type { ManualStep } from '../types/onu'

interface InteractiveGuideProps {
  onuId: string
  steps: ManualStep[]
}

interface VisibleStep {
  step: ManualStep
  stepIndex: number
}

function storageKeyFor(onuId: string): string {
  return `checklist_${onuId}`
}

function loadChecked(storageKey: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, boolean>
    }
    return {}
  } catch {
    return {}
  }
}

function itemKey(stepIndex: number, itemIndex: number): string {
  return `${stepIndex}:${itemIndex}`
}

/**
 * Normaliza el texto para que la búsqueda ignore acentos, mayúsculas
 * y separadores: "Wi-Fi" coincide con "wifi" y "Conexión" con "conexion".
 */
function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Checklist interactivo con persistencia en localStorage por ONU.
 * Incluye búsqueda rápida, índice de salto y visor ampliado de capturas.
 */
export function InteractiveGuide({ onuId, steps }: InteractiveGuideProps) {
  const storageKey = storageKeyFor(onuId)
  const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecked(storageKey))
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [highlightedStep, setHighlightedStep] = useState<number | null>(null)
  const stepRefs = useRef<Array<HTMLLIElement | null>>([])
  const highlightTimerRef = useRef<number | null>(null)

  // Persistencia del estado de los checks
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checked))
    } catch {
      // localStorage no disponible (modo privado, cuota, etc.)
    }
  }, [checked, storageKey])

  // Cerrar el modal de zoom con Escape y bloquear el scroll del fondo
  useEffect(() => {
    if (!zoomSrc) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomSrc(null)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [zoomSrc])

  // Limpiar el temporizador del destello al desmontar
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current)
      }
    }
  }, [])

  const { done, total, pct } = useMemo(() => {
    let totalItems = 0
    let doneItems = 0

    steps.forEach((step, stepIndex) => {
      const items = step.checklist ?? []
      totalItems += items.length
      items.forEach((_, itemIndex) => {
        if (checked[itemKey(stepIndex, itemIndex)]) doneItems += 1
      })
    })

    return {
      done: doneItems,
      total: totalItems,
      pct: totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100),
    }
  }, [steps, checked])

  const normalizedQuery = normalizeSearch(query)

  const visibleSteps = useMemo<VisibleStep[]>(() => {
    const indexed = steps.map((step, stepIndex) => ({ step, stepIndex }))
    if (normalizedQuery === '') return indexed

    return indexed.filter(({ step }) => {
      const haystack = normalizeSearch(
        [step.title, step.description, ...(step.checklist ?? [])].join(' '),
      )
      return haystack.includes(normalizedQuery)
    })
  }, [steps, normalizedQuery])

  const toggleItem = (stepIndex: number, itemIndex: number) => {
    const key = itemKey(stepIndex, itemIndex)
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const jumpToStep = (stepIndex: number) => {
    const element = stepRefs.current[stepIndex]
    if (!element) return

    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setHighlightedStep(stepIndex)

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current)
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedStep(null)
      highlightTimerRef.current = null
    }, 1500)
  }

  const handleReset = () => {
    if (!window.confirm('¿Reiniciar el checklist? Se desmarcarán todos los pasos.')) return
    setChecked({})
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progreso */}
      <div className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-sm font-bold uppercase tracking-wide text-slate-100">
            Progreso de la configuración
          </p>
          <span className="rounded-full border border-fiber-teal/30 bg-fiber-teal/10 px-2.5 py-0.5 font-mono text-sm font-bold text-fiber-cyan">
            {pct}%
          </span>
        </div>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-fiber-dark ring-1 ring-inset ring-fiber-border"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-fiber-teal to-fiber-emerald shadow-cyan-glow transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
          Progreso: {done} de {total} pasos completados ({pct}%)
        </p>
      </div>

      {/* Buscador y salto rápido */}
      <div className="hud-panel flex flex-col gap-3 rounded-2xl border border-fiber-border bg-fiber-card p-3 shadow-card-glow">
        <div>
          <label htmlFor={`step-search-${onuId}`} className="sr-only">
            Buscar paso del checklist
          </label>
          <div className="relative">
            <input
              id={`step-search-${onuId}`}
              type="text"
              inputMode="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="🔍 Buscar paso (ej: WAN, Wi-Fi, VLAN, Remoto, Bridge...)"
              autoComplete="off"
              className="min-h-[48px] w-full rounded-xl border border-fiber-border bg-fiber-dark/60 px-3 py-2.5 pr-14 font-mono text-base text-slate-100 placeholder:text-slate-400 transition-colors focus:border-fiber-teal focus:outline-none focus:ring-2 focus:ring-fiber-teal/30"
            />
            {query !== '' && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {normalizedQuery !== '' && (
            <p
              role="status"
              aria-live="polite"
              className="mt-1.5 font-mono text-[11px] font-semibold tracking-wide text-slate-400"
            >
              Mostrando {visibleSteps.length} de {steps.length} pasos
            </p>
          )}
        </div>

        {visibleSteps.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Salto rápido
            </p>
            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
              {visibleSteps.map(({ step, stepIndex }) => (
                <button
                  key={`jump-${step.stepNumber}-${stepIndex}`}
                  type="button"
                  onClick={() => jumpToStep(stepIndex)}
                  className="flex min-h-[44px] shrink-0 snap-start items-center gap-1.5 rounded-full border border-fiber-border bg-fiber-dark/60 px-3 font-mono text-xs font-bold text-slate-300 transition-colors hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
                >
                  <span className="text-fiber-cyan">{step.stepNumber}.</span>
                  <span className="max-w-[180px] truncate">{step.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sin coincidencias */}
      {visibleSteps.length === 0 && normalizedQuery !== '' && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-fiber-border bg-fiber-card/50 p-6 text-center">
          <p className="font-mono text-sm font-bold text-slate-300">Sin coincidencias</p>
          <p className="text-sm leading-relaxed text-slate-500">
            Prueba con otra palabra: WAN, Wi-Fi, VLAN, Remoto o Bridge.
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-1 flex min-h-[44px] items-center gap-1.5 rounded-xl border border-fiber-border px-4 font-mono text-xs font-bold text-fiber-cyan transition-colors hover:border-fiber-teal/60 hover:bg-fiber-cardHover focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Pasos filtrados */}
      <ol className="flex flex-col gap-3">
        {visibleSteps.map(({ step, stepIndex }) => {
          const items = step.checklist ?? []
          const screenshot = step.screenshot
          const isHighlighted = highlightedStep === stepIndex

          return (
            <li
              key={`${step.stepNumber}-${stepIndex}`}
              ref={(element) => {
                stepRefs.current[stepIndex] = element
              }}
              className={`hud-panel scroll-mt-24 rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow transition-all duration-300 hover:border-fiber-teal/40 ${
                isHighlighted ? 'ring-2 ring-cyan-400 shadow-cyan-glow' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fiber-teal to-fiber-cyan font-mono text-lg font-bold text-fiber-dark shadow-cyan-glow">
                  {step.stepNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-snug text-slate-50">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {step.description}
                  </p>
                </div>
              </div>

              {screenshot && (
                <div className="mt-3 rounded-xl border border-fiber-border bg-fiber-dark p-1">
                  <button
                    type="button"
                    onClick={() => setZoomSrc(screenshot)}
                    aria-label={`Ampliar captura del paso ${step.stepNumber}: ${step.title}`}
                    className="group relative block w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
                  >
                    <img
                      src={screenshot}
                      alt={`Captura del paso ${step.stepNumber}: ${step.title}`}
                      loading="lazy"
                      className="h-40 w-full rounded-lg object-contain"
                    />
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-fiber-border bg-fiber-dark/80 px-2 py-1 font-mono text-[11px] font-bold text-slate-100 backdrop-blur transition-colors group-hover:border-fiber-teal/60 group-hover:text-fiber-cyan">
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Toca para ampliar
                    </span>
                  </button>
                </div>
              )}

              {items.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {items.map((item, itemIndex) => {
                    const isChecked = Boolean(checked[itemKey(stepIndex, itemIndex)])

                    return (
                      <label
                        key={itemKey(stepIndex, itemIndex)}
                        className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-fiber-dark/60 px-3 py-2 transition-colors hover:border-fiber-border hover:bg-fiber-dark"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(stepIndex, itemIndex)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-fiber-cyan peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-fiber-dark ${
                            isChecked
                              ? 'border-fiber-emerald bg-fiber-emerald'
                              : 'border-slate-600 bg-transparent'
                          }`}
                        >
                          <Check
                            className={`h-4 w-4 text-fiber-dark transition-transform duration-200 ${
                              isChecked ? 'scale-100' : 'scale-0'
                            }`}
                          />
                        </span>
                        <span
                          className={`text-sm font-medium transition-colors duration-200 ${
                            isChecked ? 'text-slate-600 line-through' : 'text-slate-200'
                          }`}
                        >
                          {item}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* Reinicio */}
      <button
        type="button"
        onClick={handleReset}
        className="flex min-h-[44px] items-center justify-center gap-2 self-start rounded-xl px-3 font-mono text-sm font-semibold text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reiniciar Checklist
      </button>

      {/* Modal de zoom */}
      {zoomSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Captura ampliada del paso"
          onClick={() => setZoomSrc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => setZoomSrc(null)}
            aria-label="Cerrar captura ampliada"
            autoFocus
            className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-fiber-border bg-fiber-card text-slate-100 shadow-card-glow transition-colors hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          <img
            src={zoomSrc}
            alt="Captura ampliada del paso"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl border border-fiber-border object-contain shadow-cyan-glow"
          />
          <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-mono text-[11px] uppercase tracking-wide text-slate-400">
            Toca fuera para cerrar
          </p>
        </div>
      )}
    </div>
  )
}
