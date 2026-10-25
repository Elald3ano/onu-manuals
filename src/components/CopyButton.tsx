import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '../utils/clipboard'

interface CopyButtonProps {
  text: string
  label?: string
  ariaLabel?: string
  className?: string
}

/**
 * Botón táctil de copiado rápido pensado para uso en campo.
 * Muestra feedback ("¡Copiado!") durante 1.8 s y evita propagar el clic
 * para no disparar la navegación de la tarjeta contenedora.
 */
export function CopyButton({
  text,
  label = 'Copiar',
  ariaLabel,
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()

    const ok = await copyText(text)
    if (!ok) return

    setCopied(true)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? 'Copiado al portapapeles' : (ariaLabel ?? 'Copiar al portapapeles')}
      className={[
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 font-mono text-[13px] font-bold transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-fiber-dark',
        copied
          ? 'border-fiber-emerald bg-fiber-emerald text-fiber-dark shadow-cyan-glow'
          : 'border-fiber-border bg-fiber-card text-slate-300 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan active:bg-fiber-cardHover',
        className,
      ].join(' ')}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{copied ? '¡Copiado!' : label}</span>
    </button>
  )
}
