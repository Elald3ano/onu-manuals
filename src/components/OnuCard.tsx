import { useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, ExternalLink, KeyRound, Router, User, Wifi } from 'lucide-react'
import type { ONU } from '../types/onu'
import { CopyButton } from './CopyButton'

interface OnuCardProps {
  onu: ONU
  onOpen: (id: string) => void
}

interface DataRowProps {
  label: string
  value: string
  copyValue: string
  icon: ReactNode
}

function DataRow({ label, value, copyValue, icon }: DataRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/60 p-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-primary-300">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="truncate font-mono text-sm font-semibold text-slate-100">{value}</p>
        </div>
      </div>
      <CopyButton
        text={copyValue}
        label="Copiar"
        ariaLabel={`Copiar ${label}`}
        className="w-32 shrink-0"
      />
    </div>
  )
}

export function OnuCard({ onu, onOpen }: OnuCardProps) {
  const [imageFailed, setImageFailed] = useState(false)

  const ipValue = onu.defaultIp || '192.168.1.1'
  const ipDisplay = onu.defaultIp || '192.168.1.1 (sugerida)'
  const manuals = (onu.legacyManuals ?? []).filter(
    (manual) => manual.url && manual.url !== '#',
  )

  return (
    <article
      onClick={() => onOpen(onu.id)}
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800 shadow-lg shadow-slate-950/40 transition-colors hover:border-slate-600"
    >
      {/* Cabecera: miniatura + marca/modelo */}
      <div className="flex items-start gap-3 p-4">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          {imageFailed || !onu.loginUiImage ? (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
              <Router className="h-7 w-7" aria-hidden="true" />
            </div>
          ) : (
            <img
              src={onu.loginUiImage}
              alt={`Pantalla de login de ${onu.brand} ${onu.model}`}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full bg-primary-600/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-300">
            {onu.brand}
          </span>
          <h3 className="mt-1 truncate text-xl font-bold leading-tight text-slate-50">
            {onu.model}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {onu.aliases.length > 0
              ? `También: ${onu.aliases.join(' · ')}`
              : 'ONU / ONT'}
          </p>
        </div>
      </div>

      {/* Aviso técnico */}
      {onu.notes && (
        <div className="mx-4 mb-3 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p className="line-clamp-2 text-[11px] font-medium leading-snug">{onu.notes}</p>
        </div>
      )}

      {/* Datos rápidos */}
      <div className="flex flex-col gap-2 px-4">
        <DataRow
          label="IP"
          value={ipDisplay}
          copyValue={ipValue}
          icon={<Wifi className="h-4 w-4" aria-hidden="true" />}
        />
        <DataRow
          label="Usuario"
          value={onu.credentials.username}
          copyValue={onu.credentials.username}
          icon={<User className="h-4 w-4" aria-hidden="true" />}
        />
        <DataRow
          label="Contraseña"
          value={onu.credentials.password}
          copyValue={onu.credentials.password}
          icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      {/* Pie: acciones */}
      <div className="mt-3 flex flex-col gap-2 p-4 pt-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpen(onu.id)
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white shadow-lg shadow-primary-600/30 transition-colors hover:bg-primary-500 active:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          Ver Manual / Configuración
        </button>

        {manuals.map((manual, index) => (
          <a
            key={`${manual.label}-${index}`}
            href={manual.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">
              {manual.label} <span className="font-normal text-slate-400">· PDF</span>
            </span>
          </a>
        ))}
      </div>
    </article>
  )
}
