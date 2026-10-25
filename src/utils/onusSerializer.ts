import type { ONU } from '../types/onu'

function quote(value: string): string {
  return JSON.stringify(value)
}

/**
 * Serializa una ONU como objeto literal TypeScript con la indentación del arreglo `ONUS`.
 */
export function formatOnuEntry(onu: ONU): string {
  const lines: string[] = []

  lines.push('  {')
  lines.push(`    id: ${quote(onu.id)},`)
  lines.push(`    brand: ${quote(onu.brand)},`)
  lines.push(`    model: ${quote(onu.model)},`)
  lines.push(`    aliases: [${onu.aliases.map((alias) => quote(alias)).join(', ')}],`)
  lines.push(`    defaultIp: ${quote(onu.defaultIp)},`)
  lines.push('    credentials: {')
  lines.push(`      username: ${quote(onu.credentials.username)},`)
  lines.push(`      password: ${quote(onu.credentials.password)},`)
  lines.push('    },')
  lines.push(`    loginUiImage: ${quote(onu.loginUiImage)},`)

  if (onu.deviceImage) {
    lines.push(`    deviceImage: ${quote(onu.deviceImage)},`)
  }

  if (onu.legacyManuals && onu.legacyManuals.length > 0) {
    lines.push('    legacyManuals: [')
    onu.legacyManuals.forEach((manual) => {
      lines.push('      {')
      lines.push(`        label: ${quote(manual.label)},`)
      lines.push(`        url: ${quote(manual.url)},`)
      lines.push('      },')
    })
    lines.push('    ],')
  }

  if (onu.interactiveManual && onu.interactiveManual.length > 0) {
    lines.push('    interactiveManual: [')
    onu.interactiveManual.forEach((step) => {
      lines.push('      {')
      lines.push(`        stepNumber: ${step.stepNumber},`)
      lines.push(`        title: ${quote(step.title)},`)
      lines.push(`        description: ${quote(step.description)},`)
      if (step.screenshot) {
        lines.push(`        screenshot: ${quote(step.screenshot)},`)
      }
      if (step.checklist && step.checklist.length > 0) {
        lines.push(`        checklist: [${step.checklist.map((item) => quote(item)).join(', ')}],`)
      }
      lines.push('      },')
    })
    lines.push('    ],')
  }

  if (onu.notes) {
    lines.push(`    notes: ${quote(onu.notes)},`)
  }

  lines.push('  }')
  return lines.join('\n')
}

/**
 * Genera el contenido completo de `src/data/onus.ts` a partir de una lista de ONUs.
 */
export function serializeOnusFile(onus: ONU[]): string {
  const header = [
    "import type { ONU } from '../types/onu'",
    '',
    '/**',
    ' * Catálogo de ONUs del proyecto onu-manuals.',
    ' * Generado desde el panel de administración.',
    ' */',
    '',
    'export function getOnuById(id: string): ONU | undefined {',
    '  return ONUS.find((onu) => onu.id === id)',
    '}',
    '',
    'export const ONUS: ONU[] = [',
  ].join('\n')

  const body = onus.map((onu) => formatOnuEntry(onu)).join(',\n')
  return `${header}\n${body},\n]\n`
}
