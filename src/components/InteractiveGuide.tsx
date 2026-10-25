import { useEffect, useMemo, useState } from 'react'
import { Check, Maximize2, RotateCcw, X } from 'lucide-react'
import type { ManualStep } from '../types/onu'

interface InteractiveGuideProps {
  onuId: string
  steps: ManualStep[]
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
 * Checklist interactivo con persistencia en localStorage por ONU.
 * El progreso cuenta las verificaciones (checklist) marcadas.
 */
export function InteractiveGuide({ onuId, steps }: InteractiveGuideProps) {
  const storageKey = storageKeyFor(onuId)
  const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecked(storageKey))
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)

  // Persistencia del estado de los checks
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checked))
    } catch {
      // localStorage no disponible (modo privado, cuota, etc.)
    }
  }, [checked, storageKey])

  // Cerrar el modal de zoom con Escape
  useEffect(() => {
    if (!zoomSrc) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomSrc(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomSrc])

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

  const toggleItem = (stepIndex: number, itemIndex: number) => {
    const key = itemKey(stepIndex, itemIndex)
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
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

      {/* Pasos */}
      <ol className="flex flex-col gap-3">
        {steps.map((step, stepIndex) => {
          const items = step.checklist ?? []
          const screenshot = step.screenshot

          return (
            <li
              key={`${step.stepNumber}-${stepIndex}`}
              className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow transition-colors duration-200 hover:border-fiber-teal/40"
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
                    className="relative block w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
                  >
                    <img
                      src={screenshot}
                      alt={`Captura del paso ${step.stepNumber}: ${step.title}`}
                      loading="lazy"
                      className="h-40 w-full rounded-lg object-contain"
                    />
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-fiber-border bg-fiber-dark/80 px-2 py-1 font-mono text-[11px] font-bold text-slate-100 backdrop-blur">
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Ampliar
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
          aria-label="Captura ampliada"
          onClick={() => setZoomSrc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-fiber-dark/95 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setZoomSrc(null)}
            aria-label="Cerrar captura"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-fiber-border bg-fiber-card text-slate-100 transition-colors hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={zoomSrc}
            alt="Captura ampliada del paso"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl border border-fiber-border object-contain shadow-cyan-glow"
          />
        </div>
      )}
    </div>
  )
}
