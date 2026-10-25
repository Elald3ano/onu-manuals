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
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        copied
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-600',
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
