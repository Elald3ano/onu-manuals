import type { ReactNode } from 'react'
import { AlertTriangle, ExternalLink, KeyRound, User, Wifi } from 'lucide-react'
import type { ONU } from '../types/onu'
import { CopyButton } from './CopyButton'
import { OnuImageGallery } from './OnuImageGallery'

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
    <div className="flex items-center justify-between gap-2 rounded-xl border border-fiber-border/70 bg-fiber-dark/60 p-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fiber-teal/10 text-fiber-cyan ring-1 ring-inset ring-fiber-teal/20">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="truncate font-mono text-sm font-semibold text-fiber-amber">{value}</p>
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
  const ipValue = onu.defaultIp || '192.168.1.1'
  const ipDisplay = onu.defaultIp || '192.168.1.1 (sugerida)'
  const manuals = (onu.legacyManuals ?? []).filter(
    (manual) => manual.url && manual.url !== '#',
  )

  return (
    <article
      onClick={() => onOpen(onu.id)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-fiber-border bg-fiber-card shadow-card-glow transition-all duration-300 hover:-translate-y-0.5 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:shadow-cyan-glow"
    >
      {/* Galería (interfaz login / equipo físico) */}
      <div className="px-4 pt-4">
        <OnuImageGallery
          loginUiImage={onu.loginUiImage}
          deviceImage={onu.deviceImage}
          alt={`${onu.brand} ${onu.model}`}
          variant="card"
        />
      </div>

      {/* Cabecera: marca/modelo */}
      <div className="flex items-start gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full border border-fiber-teal/30 bg-fiber-teal/10 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-fiber-cyan">
            {onu.brand}
          </span>
          <h3 className="mt-1 truncate font-mono text-xl font-bold leading-tight tracking-tight text-slate-50 transition-colors duration-200 group-hover:text-fiber-cyan">
            {onu.model}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {onu.aliases.length > 0
              ? `También: ${onu.aliases.join(' · ')}`
              : 'ONU / ONT'}
          </p>
        </div>
      </div>

      {/* Aviso técnico */}
      {onu.notes && (
        <div className="mx-4 mt-3 flex items-start gap-1.5 rounded-lg border border-fiber-amber/25 bg-fiber-amber/10 px-2.5 py-1.5 text-fiber-amber">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p className="line-clamp-2 text-[11px] font-medium leading-snug">{onu.notes}</p>
        </div>
      )}

      {/* Datos rápidos */}
      <div className="mt-3 flex flex-col gap-2 px-4">
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
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-4 font-mono text-sm font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal active:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-fiber-dark"
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
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-fiber-border bg-fiber-dark/60 px-4 font-mono text-sm font-bold text-slate-200 transition-all duration-200 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">
              {manual.label} <span className="font-normal text-slate-500">· PDF</span>
            </span>
          </a>
        ))}
      </div>
    </article>
  )
}
