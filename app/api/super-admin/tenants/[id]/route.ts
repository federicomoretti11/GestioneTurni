import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { PianoTenant } from '@/lib/types'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('id, is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) return null
  return { userId: user.id }
}

const PIANO_FLAGS: Record<PianoTenant, Record<string, boolean>> = {
  starter: {
    gps_checkin_abilitato: true,
    modulo_tasks_abilitato: false,
    modulo_documenti_abilitato: false,
    modulo_cedolini_abilitato: false,
    modulo_analytics_abilitato: false,
    modulo_paghe_abilitato: false,
    modulo_ai_copilot_abilitato: false,
    white_label_abilitato: false,
  },
  professional: {
    gps_checkin_abilitato: true,
    modulo_tasks_abilitato: true,
    modulo_documenti_abilitato: true,
    modulo_cedolini_abilitato: true,
    modulo_analytics_abilitato: true,
    modulo_paghe_abilitato: false,
    modulo_ai_copilot_abilitato: false,
    white_label_abilitato: false,
  },
  enterprise: {
    gps_checkin_abilitato: true,
    modulo_tasks_abilitato: true,
    modulo_documenti_abilitato: true,
    modulo_cedolini_abilitato: true,
    modulo_analytics_abilitato: true,
    modulo_paghe_abilitato: true,
    modulo_ai_copilot_abilitato: true,
    white_label_abilitato: true,
  },
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await checkSuperAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const admin = createAdminClient()
  const { id } = params

  const { data: tenant, error } = await admin
    .from('tenants')
    .select('id, nome, slug, attivo, piano, piano_scadenza, piano_note, created_at')
    .eq('id', id)
    .single()
  if (error || !tenant) return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })

  const { data: imp } = await admin
    .from('impostazioni')
    .select('gps_checkin_abilitato, email_notifiche_abilitato, modulo_tasks_abilitato, modulo_documenti_abilitato, modulo_cedolini_abilitato, modulo_analytics_abilitato, modulo_paghe_abilitato, modulo_ai_copilot_abilitato, white_label_abilitato')
    .eq('tenant_id', id)
    .single()

  const { count: utenti_count } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', id)
    .eq('attivo', true)

  const { data: piano_log } = await admin
    .from('tenant_piano_log')
    .select('id, piano, cambiato_da, note, created_at')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    ...tenant,
    impostazioni: imp ?? null,
    utenti_count: utenti_count ?? 0,
    piano_log: piano_log ?? [],
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await checkSuperAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const { id } = params
  const admin = createAdminClient()

  // Aggiornamento piano (applica flag automaticamente)
  if (body.piano !== undefined) {
    const piano = body.piano as PianoTenant
    if (!['starter', 'professional', 'enterprise'].includes(piano)) {
      return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
    }

    const tenantUpdates: Record<string, unknown> = { piano }
    if ('piano_scadenza' in body) tenantUpdates.piano_scadenza = body.piano_scadenza ?? null
    if ('piano_note' in body) tenantUpdates.piano_note = body.piano_note ?? null

    const { error: tErr } = await admin.from('tenants').update(tenantUpdates).eq('id', id)
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

    await admin.from('impostazioni').upsert(
      { tenant_id: id, ...PIANO_FLAGS[piano] },
      { onConflict: 'tenant_id' }
    )

    await admin.from('tenant_piano_log').insert({
      tenant_id: id,
      piano,
      cambiato_da: ctx.userId,
      note: body.piano_note ?? null,
    })

    return NextResponse.json({ ok: true })
  }

  // Aggiornamento metadata senza cambio piano
  if ('piano_scadenza' in body || 'piano_note' in body) {
    const updates: Record<string, unknown> = {}
    if ('piano_scadenza' in body) updates.piano_scadenza = body.piano_scadenza ?? null
    if ('piano_note' in body) updates.piano_note = body.piano_note ?? null
    await admin.from('tenants').update(updates).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Override manuale singolo flag
  const FLAG_KEYS = [
    'gps_checkin_abilitato', 'email_notifiche_abilitato',
    'modulo_tasks_abilitato', 'modulo_documenti_abilitato',
    'modulo_cedolini_abilitato', 'modulo_analytics_abilitato',
    'modulo_paghe_abilitato', 'modulo_ai_copilot_abilitato', 'white_label_abilitato',
  ]
  const flagUpdates: Record<string, boolean> = {}
  for (const key of FLAG_KEYS) {
    if (key in body && typeof body[key] === 'boolean') flagUpdates[key] = body[key]
  }
  if (Object.keys(flagUpdates).length > 0) {
    await admin.from('impostazioni').upsert(
      { tenant_id: id, ...flagUpdates },
      { onConflict: 'tenant_id' }
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
}
