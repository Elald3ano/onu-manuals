import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Edit3,
  ExternalLink,
  Info,
  KeyRound,
  User,
  Wifi,
} from 'lucide-react'
import { getOnuById } from '../data/onus'
import { CopyButton } from '../components/CopyButton'
import { ShareButton } from '../components/ShareButton'
import { InteractiveGuide } from '../components/InteractiveGuide'
import { OnuImageGallery } from '../components/OnuImageGallery'

interface DetailViewProps {
  id: string
}

interface AccessFieldProps {
  label: string
  value: string
  copyValue: string
  icon: ReactNode
}

function AccessField({ label, value, copyValue, icon }: AccessFieldProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-fiber-border/70 bg-fiber-dark/60 p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fiber-teal/10 text-fiber-cyan ring-1 ring-inset ring-fiber-teal/20">
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

export function DetailView({ id }: DetailViewProps) {
  const onu = getOnuById(id)

  if (!onu) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-fiber-border bg-fiber-card p-8 text-center shadow-card-glow">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-slate-50">
            Equipo no encontrado
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            No existe una ONU con el identificador “{id}”.
          </p>
        </div>
        <a
          href="#/"
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-sm font-bold uppercase tracking-wide text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-fiber-dark"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al catálogo
        </a>
      </div>
    )
  }

  const ipValue = onu.defaultIp || '192.168.1.1'
  const ipDisplay = onu.defaultIp || '192.168.1.1 (sugerida)'
  const manuals = (onu.legacyManuals ?? []).filter(
    (manual) => manual.url && manual.url !== '#',
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Volver al catálogo */}
      <a
        href="#/"
        className="flex w-fit items-center gap-2 rounded-xl border border-fiber-border bg-fiber-card px-4 py-2.5 font-mono text-sm font-bold text-slate-200 transition-all duration-200 hover:border-fiber-teal/60 hover:bg-fiber-cardHover hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al Catálogo
      </a>

      {/* Encabezado del equipo */}
      <section className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full border border-fiber-teal/30 bg-fiber-teal/10 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-fiber-cyan">
              {onu.brand}
            </span>
            <h1 className="mt-1 font-mono text-2xl font-bold leading-tight tracking-tight text-slate-50">
              {onu.model}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {onu.aliases.length > 0
                ? `También conocido como: ${onu.aliases.join(', ')}`
                : 'ONU / ONT'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:shrink-0 sm:items-end">
            <ShareButton onu={onu} />
            <a
              href={`#/admin?edit=${onu.id}`}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-fiber-border bg-fiber-card px-4 font-mono text-sm font-bold text-slate-300 transition-all duration-200 hover:border-fiber-teal/60 hover:text-fiber-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              Editar manual
            </a>
          </div>
        </div>
      </section>

      {/* Tarjeta de acceso rápido */}
      <section className="hud-panel rounded-2xl border border-fiber-border bg-fiber-card p-4 shadow-card-glow">
        <h2 className="mb-3 font-mono text-base font-bold uppercase tracking-wide text-slate-50">
          Acceso rápido
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OnuImageGallery
            loginUiImage={onu.loginUiImage}
            deviceImage={onu.deviceImage}
            alt={`${onu.brand} ${onu.model}`}
            variant="detail"
          />

          <div className="flex flex-col gap-2">
            <AccessField
              label="IP"
              value={ipDisplay}
              copyValue={ipValue}
              icon={<Wifi className="h-4 w-4" aria-hidden="true" />}
            />
            <AccessField
              label="Usuario"
              value={onu.credentials.username}
              copyValue={onu.credentials.username}
              icon={<User className="h-4 w-4" aria-hidden="true" />}
            />
            <AccessField
              label="Contraseña"
              value={onu.credentials.password}
              copyValue={onu.credentials.password}
              icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        </div>

        {manuals.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {manuals.map((manual, index) => (
              <a
                key={`${manual.label}-${index}`}
                href={manual.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-4 font-mono text-sm font-bold text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-fiber-dark"
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">📄 Abrir {manual.label} en Drive</span>
              </a>
            ))}
          </div>
        )}

        {onu.notes && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-fiber-amber/25 bg-fiber-amber/10 p-3 text-fiber-amber">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium leading-relaxed">{onu.notes}</p>
          </div>
        )}
      </section>

      {/* Configuración paso a paso */}
      <section>
        <h2 className="mb-3 font-mono text-base font-bold uppercase tracking-wide text-slate-50">
          Configuración paso a paso
        </h2>

        {onu.interactiveManual && onu.interactiveManual.length > 0 ? (
          <InteractiveGuide onuId={onu.id} steps={onu.interactiveManual} />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-fiber-border bg-fiber-card/50 p-6 text-center">
            <Info className="h-8 w-8 text-fiber-teal/60" aria-hidden="true" />
            <p className="max-w-md text-sm leading-relaxed text-slate-300">
              Este modelo aún no tiene checklist interactivo paso a paso. Puedes consultar
              el manual original en PDF a continuación.
            </p>
            {manuals.length > 0 ? (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                {manuals.map((manual, index) => (
                  <a
                    key={`${manual.label}-${index}`}
                    href={manual.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fiber-teal to-fiber-cyan px-5 font-mono text-sm font-bold text-fiber-dark shadow-cyan-glow transition-all duration-200 hover:from-fiber-cyan hover:to-fiber-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-fiber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-fiber-dark"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                    📄 Abrir {manual.label} en Drive
                  </a>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs uppercase tracking-wide text-slate-500">
                Sin manuales PDF disponibles para este equipo.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
