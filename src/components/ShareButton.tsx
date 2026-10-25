import { useEffect, useRef, useState } from 'react'
import { Check, Link as LinkIcon, MessageCircle } from 'lucide-react'
import type { ONU } from '../types/onu'
import { copyText } from '../utils/clipboard'

interface ShareButtonProps {
  onu: ONU
}

/**
 * Comparte la ficha del equipo por WhatsApp o copia el enlace directo.
 * Pensado para que un técnico pase la configuración a un compañero.
 */
export function ShareButton({ onu }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const ip = onu.defaultIp || '192.168.1.1'
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const message = [
    `🔧 *Guía de Configuración: ${onu.brand} ${onu.model}*`,
    `🌐 IP Acceso: ${ip}`,
    `👤 Usuario: ${onu.credentials.username}`,
    `🔑 Contraseña: ${onu.credentials.password}`,
    `📖 Ver manual y checklist completo aquí:`,
    shareUrl,
  ].join('\n')

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`

  const handleCopyLink = async () => {
    const ok = await copyText(window.location.href)
    if (!ok) return

    setCopied(true)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white transition-colors hover:bg-[#1ebd5b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Compartir por WhatsApp
      </a>

      <button
        type="button"
        onClick={handleCopyLink}
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        {copied ? (
          <Check className="h-4 w-4 text-success-400" aria-hidden="true" />
        ) : (
          <LinkIcon className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
      </button>
    </div>
  )
}
