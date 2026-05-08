import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantId } from '@/lib/tenant'
import type { ImpostazioniTenant } from '@/lib/types'

async function getFlag(campo: keyof ImpostazioniTenant, defaultVal = false): Promise<boolean> {
  try {
    const tenantId = getTenantId()
    if (!tenantId) return defaultVal
    const { data } = await createAdminClient()
      .from('impostazioni')
      .select(campo)
      .eq('tenant_id', tenantId)
      .single()
    return (data as Record<string, boolean> | null)?.[campo] ?? defaultVal
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
      .select('gps_checkin_abilitato, email_notifiche_abilitato, modulo_cedolini_abilitato, modulo_analytics_abilitato, modulo_tasks_abilitato, modulo_documenti_abilitato, modulo_paghe_abilitato, modulo_ai_copilot_abilitato, white_label_abilitato')
      .eq('tenant_id', tenantId)
      .single()
    if (!data) return defaultImpostazioni()
    return {
      gps_checkin_abilitato: data.gps_checkin_abilitato ?? true,
      email_notifiche_abilitato: data.email_notifiche_abilitato ?? false,
      modulo_cedolini_abilitato: data.modulo_cedolini_abilitato ?? false,
      modulo_analytics_abilitato: data.modulo_analytics_abilitato ?? false,
      modulo_tasks_abilitato: data.modulo_tasks_abilitato ?? true,
      modulo_documenti_abilitato: data.modulo_documenti_abilitato ?? true,
      modulo_paghe_abilitato: data.modulo_paghe_abilitato ?? false,
      modulo_ai_copilot_abilitato: data.modulo_ai_copilot_abilitato ?? false,
      white_label_abilitato: data.white_label_abilitato ?? false,
    }
  } catch {
    return defaultImpostazioni()
  }
}

function defaultImpostazioni(): ImpostazioniTenant {
  return {
    gps_checkin_abilitato: true,
    email_notifiche_abilitato: false,
    modulo_cedolini_abilitato: false,
    modulo_analytics_abilitato: false,
    modulo_tasks_abilitato: true,
    modulo_documenti_abilitato: true,
    modulo_paghe_abilitato: false,
    modulo_ai_copilot_abilitato: false,
    white_label_abilitato: false,
  }
}
