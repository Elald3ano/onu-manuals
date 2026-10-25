import type { LegacyManualLink, ManualStep } from './onu'

/**
 * Tipos de la tabla `public.onus` en Supabase.
 * Se mantienen alineados con `supabase/schema.sql`.
 */
export type OnusRow = {
  id: string
  brand: string
  model: string
  aliases: string[]
  default_ip: string
  username: string
  password: string
  login_ui_image: string
  device_image: string | null
  legacy_manuals: LegacyManualLink[]
  interactive_manual: ManualStep[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type OnusInsert = {
  id: string
  brand: string
  model: string
  aliases?: string[]
  default_ip?: string
  username?: string
  password?: string
  login_ui_image?: string
  device_image?: string | null
  legacy_manuals?: LegacyManualLink[]
  interactive_manual?: ManualStep[] | null
  notes?: string | null
}

export type OnusUpdate = Partial<OnusInsert>

export type Database = {
  public: {
    Tables: {
      onus: {
        Row: OnusRow
        Insert: OnusInsert
        Update: OnusUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
