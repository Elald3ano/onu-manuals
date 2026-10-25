import { useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Monitor, Package, Router } from 'lucide-react'

interface OnuImageGalleryProps {
  loginUiImage?: string
  deviceImage?: string
  alt: string
  variant?: 'card' | 'detail'
  className?: string
}

interface GalleryImage {
  src: string
  label: string
  icon: ReactNode
}

/**
 * Galería tipo tienda para las fotos de una ONU (interfaz de login + equipo físico).
 * Si solo hay una imagen, no muestra controles.
 */
export function OnuImageGallery({
  loginUiImage,
  deviceImage,
  alt,
  variant = 'card',
  className = '',
}: OnuImageGalleryProps) {
  const images: GalleryImage[] = []

  if (loginUiImage) {
    images.push({
      src: loginUiImage,
      label: 'Interfaz Login',
      icon: <Monitor className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    })
  }

  if (deviceImage) {
    images.push({
      src: deviceImage,
      label: 'Equipo Físico',
      icon: <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    })
  }

  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState<Record<string, boolean>>({})

  const heightClass = variant === 'detail' ? 'h-52 sm:h-64' : 'h-40'

  if (images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-fiber-border bg-fiber-dark text-slate-600 ${heightClass} ${className}`}
      >
        <Router className="h-10 w-10" aria-hidden="true" />
      </div>
    )
  }

  const safeIndex = Math.min(active, images.length - 1)
  const current = images[safeIndex]
  const hasMultiple = images.length > 1

  const select = (index: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setActive(index)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Imagen activa */}
      <div
        className={`relative overflow-hidden rounded-xl border border-fiber-border bg-fiber-dark shadow-card-glow ${heightClass}`}
      >
        {failed[current.src] ? (
          <div className="flex h-full w-full items-center justify-center text-slate-600">
            <Router className="h-10 w-10" aria-hidden="true" />
          </div>
        ) : (
          <img
            key={current.src}
            src={current.src}
            alt={`${alt} - ${current.label}`}
            loading="lazy"
            onError={() => setFailed((prev) => ({ ...prev, [current.src]: true }))}
            className="h-full w-full object-contain"
          />
        )}
        {/* Hairline HUD superior */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fiber-cyan/50 to-transparent"
        />
      </div>

      {/* Controles (solo si hay 2+ imágenes) */}
      {hasMultiple && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={select(index)}
                aria-pressed={index === safeIndex}
                aria-label={`Ver ${image.label}`}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${
                  index === safeIndex
                    ? 'border-fiber-cyan bg-fiber-teal/15 text-fiber-cyan shadow-cyan-glow'
                    : 'border-fiber-border bg-fiber-dark/60 text-slate-500 hover:border-fiber-teal/50 hover:text-fiber-cyan'
                }`}
              >
                {image.icon}
                <span className="truncate">{image.label}</span>
              </button>
            ))}
          </div>

          {/* Dots tipo tienda */}
          <div className="flex justify-center gap-1.5">
            {images.map((image, index) => (
              <button
                key={`dot-${image.src}`}
                type="button"
                onClick={select(index)}
                aria-label={`Ir a ${image.label}`}
                className={`h-2 rounded-full transition-all ${
                  index === safeIndex ? 'w-5 bg-fiber-cyan shadow-cyan-glow' : 'w-2 bg-fiber-border'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
