import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'
import type { ImpostazioniTenant } from '@/lib/types'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data } = await supabase
    .from('impostazioni')
    .select('gps_checkin_abilitato, email_notifiche_abilitato, modulo_cedolini_abilitato, modulo_analytics_abilitato, modulo_tasks_abilitato, modulo_documenti_abilitato, modulo_paghe_abilitato, modulo_ai_copilot_abilitato, white_label_abilitato')
    .single()

  const imp: ImpostazioniTenant = {
    gps_checkin_abilitato: data?.gps_checkin_abilitato ?? true,
    email_notifiche_abilitato: data?.email_notifiche_abilitato ?? false,
    modulo_cedolini_abilitato: data?.modulo_cedolini_abilitato ?? false,
    modulo_analytics_abilitato: data?.modulo_analytics_abilitato ?? false,
    modulo_tasks_abilitato: data?.modulo_tasks_abilitato ?? true,
    modulo_documenti_abilitato: data?.modulo_documenti_abilitato ?? true,
    modulo_paghe_abilitato: data?.modulo_paghe_abilitato ?? false,
    modulo_ai_copilot_abilitato: data?.modulo_ai_copilot_abilitato ?? false,
    white_label_abilitato: data?.white_label_abilitato ?? false,
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
  const body = await req.json() as Partial<ImpostazioniTenant>
  const campiConsentiti: (keyof ImpostazioniTenant)[] = [
    'gps_checkin_abilitato',
    'email_notifiche_abilitato',
    'modulo_cedolini_abilitato',
    'modulo_analytics_abilitato',
    'modulo_tasks_abilitato',
    'modulo_documenti_abilitato',
    'modulo_paghe_abilitato',
    'modulo_ai_copilot_abilitato',
    'white_label_abilitato',
  ]

  const update: Record<string, boolean> = {}
  for (const campo of campiConsentiti) {
    if (typeof body[campo] === 'boolean') update[campo] = body[campo] as boolean
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

  const { error } = await createAdminClient().from('impostazioni').update(update).eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
