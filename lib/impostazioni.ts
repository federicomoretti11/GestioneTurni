import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantId } from '@/lib/tenant'
import type { ImpostazioniTenant } from '@/lib/types'

const DEFAULT_RUOLI = ['admin', 'manager', 'dipendente']

const RUOLI_FIELDS =
  'modulo_tasks_ruoli, modulo_documenti_ruoli, modulo_cedolini_ruoli, modulo_analytics_ruoli, modulo_paghe_ruoli, modulo_ai_copilot_ruoli'

const BOOL_FIELDS =
  'gps_checkin_abilitato, email_notifiche_abilitato, modulo_cedolini_abilitato, modulo_analytics_abilitato, modulo_tasks_abilitato, modulo_documenti_abilitato, modulo_paghe_abilitato, modulo_ai_copilot_abilitato, white_label_abilitato, modulo_contratti_abilitato, modulo_straordinari_abilitato, modulo_ferie_contatori_abilitato, modulo_staffing_abilitato, modulo_indisponibilita_abilitato'

async function getFlag(campo: keyof ImpostazioniTenant, defaultVal = false): Promise<boolean> {
  try {
    const tenantId = getTenantId()
    if (!tenantId) return defaultVal
    const { data } = await createAdminClient()
      .from('impostazioni')
      .select(campo as string)
      .eq('tenant_id', tenantId)
      .single()
    return (data as Record<string, boolean> | null)?.[campo as string] ?? defaultVal
  } catch {
    return defaultVal
  }
}

export async function isEmailAbilitata(): Promise<boolean> {
  return getFlag('email_notifiche_abilitato', false)
}

export async function isCedoliniAbilitato(): Promise<boolean> {
  return getFlag('modulo_cedolini_abilitato', false)
}

export async function isAnalyticsAbilitato(): Promise<boolean> {
  return getFlag('modulo_analytics_abilitato', false)
}

export async function isTasksAbilitato(): Promise<boolean> {
  return getFlag('modulo_tasks_abilitato', true)
}

export async function isDocumentiAbilitato(): Promise<boolean> {
  return getFlag('modulo_documenti_abilitato', true)
}

export async function getImpostazioni(): Promise<ImpostazioniTenant> {
  try {
    const tenantId = getTenantId()
    if (!tenantId) return defaultImpostazioni()
    const { data } = await createAdminClient()
      .from('impostazioni')
      .select(`${BOOL_FIELDS}, ${RUOLI_FIELDS}`)
      .eq('tenant_id', tenantId)
      .single()
    if (!data) return defaultImpostazioni()
    return {
      gps_checkin_abilitato:      data.gps_checkin_abilitato ?? true,
      email_notifiche_abilitato:  data.email_notifiche_abilitato ?? false,
      modulo_cedolini_abilitato:  data.modulo_cedolini_abilitato ?? false,
      modulo_analytics_abilitato: data.modulo_analytics_abilitato ?? false,
      modulo_tasks_abilitato:     data.modulo_tasks_abilitato ?? true,
      modulo_documenti_abilitato: data.modulo_documenti_abilitato ?? true,
      modulo_paghe_abilitato:            data.modulo_paghe_abilitato ?? false,
      modulo_ai_copilot_abilitato:       data.modulo_ai_copilot_abilitato ?? false,
      white_label_abilitato:             data.white_label_abilitato ?? false,
      modulo_contratti_abilitato:        data.modulo_contratti_abilitato ?? false,
      modulo_straordinari_abilitato:     data.modulo_straordinari_abilitato ?? false,
      modulo_ferie_contatori_abilitato:  data.modulo_ferie_contatori_abilitato ?? false,
      modulo_staffing_abilitato:         data.modulo_staffing_abilitato ?? false,
      modulo_indisponibilita_abilitato:  data.modulo_indisponibilita_abilitato ?? false,
      modulo_tasks_ruoli:         (data.modulo_tasks_ruoli      as string[] | null) ?? DEFAULT_RUOLI,
      modulo_documenti_ruoli:     (data.modulo_documenti_ruoli  as string[] | null) ?? DEFAULT_RUOLI,
      modulo_cedolini_ruoli:      (data.modulo_cedolini_ruoli   as string[] | null) ?? DEFAULT_RUOLI,
      modulo_analytics_ruoli:     (data.modulo_analytics_ruoli  as string[] | null) ?? DEFAULT_RUOLI,
      modulo_paghe_ruoli:         (data.modulo_paghe_ruoli      as string[] | null) ?? DEFAULT_RUOLI,
      modulo_ai_copilot_ruoli:    (data.modulo_ai_copilot_ruoli as string[] | null) ?? DEFAULT_RUOLI,
    }
  } catch {
    return defaultImpostazioni()
  }
}

export function moduliPerRuolo(imp: ImpostazioniTenant, ruolo: string): ImpostazioniTenant {
  return {
    ...imp,
    modulo_tasks_abilitato:     imp.modulo_tasks_abilitato     && imp.modulo_tasks_ruoli.includes(ruolo),
    modulo_documenti_abilitato: imp.modulo_documenti_abilitato && imp.modulo_documenti_ruoli.includes(ruolo),
    modulo_cedolini_abilitato:  imp.modulo_cedolini_abilitato  && imp.modulo_cedolini_ruoli.includes(ruolo),
    modulo_analytics_abilitato: imp.modulo_analytics_abilitato && imp.modulo_analytics_ruoli.includes(ruolo),
    modulo_paghe_abilitato:     imp.modulo_paghe_abilitato     && imp.modulo_paghe_ruoli.includes(ruolo),
    modulo_ai_copilot_abilitato:imp.modulo_ai_copilot_abilitato && imp.modulo_ai_copilot_ruoli.includes(ruolo),
  }
}

function defaultImpostazioni(): ImpostazioniTenant {
  return {
    gps_checkin_abilitato:      true,
    email_notifiche_abilitato:  false,
    modulo_cedolini_abilitato:  false,
    modulo_analytics_abilitato: false,
    modulo_tasks_abilitato:     true,
    modulo_documenti_abilitato: true,
    modulo_paghe_abilitato:            false,
    modulo_ai_copilot_abilitato:       false,
    white_label_abilitato:             false,
    modulo_contratti_abilitato:        false,
    modulo_straordinari_abilitato:     false,
    modulo_ferie_contatori_abilitato:  false,
    modulo_staffing_abilitato:         false,
    modulo_indisponibilita_abilitato:  false,
    modulo_tasks_ruoli:         DEFAULT_RUOLI,
    modulo_documenti_ruoli:     DEFAULT_RUOLI,
    modulo_cedolini_ruoli:      DEFAULT_RUOLI,
    modulo_analytics_ruoli:     DEFAULT_RUOLI,
    modulo_paghe_ruoli:         DEFAULT_RUOLI,
    modulo_ai_copilot_ruoli:    DEFAULT_RUOLI,
  }
}
