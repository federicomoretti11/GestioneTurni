import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'
import type { ImpostazioniTenant } from '@/lib/types'

const DEFAULT_RUOLI = ['admin', 'manager', 'dipendente']

const CAMPI_FLAG = [
  'gps_checkin_abilitato', 'email_notifiche_abilitato',
  'modulo_cedolini_abilitato', 'modulo_analytics_abilitato',
  'modulo_tasks_abilitato', 'modulo_documenti_abilitato',
  'modulo_paghe_abilitato', 'modulo_ai_copilot_abilitato', 'white_label_abilitato',
  'modulo_contratti_abilitato', 'modulo_straordinari_abilitato',
  'modulo_ferie_contatori_abilitato', 'modulo_staffing_abilitato',
  'modulo_indisponibilita_abilitato',
] as const

const CAMPI_RUOLI = [
  'modulo_tasks_ruoli', 'modulo_documenti_ruoli', 'modulo_cedolini_ruoli',
  'modulo_analytics_ruoli', 'modulo_paghe_ruoli', 'modulo_ai_copilot_ruoli',
] as const

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data } = await supabase
    .from('impostazioni')
    .select('gps_checkin_abilitato, email_notifiche_abilitato, modulo_cedolini_abilitato, modulo_analytics_abilitato, modulo_tasks_abilitato, modulo_documenti_abilitato, modulo_paghe_abilitato, modulo_ai_copilot_abilitato, white_label_abilitato, modulo_tasks_ruoli, modulo_documenti_ruoli, modulo_cedolini_ruoli, modulo_analytics_ruoli, modulo_paghe_ruoli, modulo_ai_copilot_ruoli, modulo_contratti_abilitato, modulo_straordinari_abilitato, modulo_ferie_contatori_abilitato, modulo_staffing_abilitato, modulo_indisponibilita_abilitato')
    .single()

  const imp: ImpostazioniTenant = {
    gps_checkin_abilitato:       data?.gps_checkin_abilitato ?? true,
    email_notifiche_abilitato:   data?.email_notifiche_abilitato ?? false,
    modulo_cedolini_abilitato:   data?.modulo_cedolini_abilitato ?? false,
    modulo_analytics_abilitato:  data?.modulo_analytics_abilitato ?? false,
    modulo_tasks_abilitato:      data?.modulo_tasks_abilitato ?? true,
    modulo_documenti_abilitato:  data?.modulo_documenti_abilitato ?? true,
    modulo_paghe_abilitato:           data?.modulo_paghe_abilitato ?? false,
    modulo_ai_copilot_abilitato:      data?.modulo_ai_copilot_abilitato ?? false,
    white_label_abilitato:            data?.white_label_abilitato ?? false,
    modulo_contratti_abilitato:       data?.modulo_contratti_abilitato ?? false,
    modulo_straordinari_abilitato:    data?.modulo_straordinari_abilitato ?? false,
    modulo_ferie_contatori_abilitato: data?.modulo_ferie_contatori_abilitato ?? false,
    modulo_staffing_abilitato:        data?.modulo_staffing_abilitato ?? false,
    modulo_indisponibilita_abilitato: data?.modulo_indisponibilita_abilitato ?? false,
    modulo_tasks_ruoli:          (data?.modulo_tasks_ruoli      as string[] | null) ?? DEFAULT_RUOLI,
    modulo_documenti_ruoli:      (data?.modulo_documenti_ruoli  as string[] | null) ?? DEFAULT_RUOLI,
    modulo_cedolini_ruoli:       (data?.modulo_cedolini_ruoli   as string[] | null) ?? DEFAULT_RUOLI,
    modulo_analytics_ruoli:      (data?.modulo_analytics_ruoli  as string[] | null) ?? DEFAULT_RUOLI,
    modulo_paghe_ruoli:          (data?.modulo_paghe_ruoli      as string[] | null) ?? DEFAULT_RUOLI,
    modulo_ai_copilot_ruoli:     (data?.modulo_ai_copilot_ruoli as string[] | null) ?? DEFAULT_RUOLI,
  }
  return NextResponse.json(imp)
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if ((profile as { ruolo?: string } | null)?.ruolo !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const tenantId = requireTenantId()
  const body = await req.json()
  const update: Record<string, boolean | string[]> = {}

  for (const campo of CAMPI_FLAG) {
    if (typeof body[campo] === 'boolean') update[campo] = body[campo] as boolean
  }
  for (const campo of CAMPI_RUOLI) {
    if (Array.isArray(body[campo]) && (body[campo] as unknown[]).every(r => typeof r === 'string')) {
      update[campo] = body[campo] as string[]
    }
  }

  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

  const { error } = await createAdminClient().from('impostazioni').update(update).eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
