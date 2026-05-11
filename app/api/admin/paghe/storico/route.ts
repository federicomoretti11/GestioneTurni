// app/api/admin/paghe/storico/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.ruolo ?? '')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('consuntivi_paghe')
    .select('id, mese, stato, approvato_at, approvato_da, profiles!consuntivi_paghe_approvato_da_fkey(nome, cognome)')
    .eq('tenant_id', tenantId)
    .eq('stato', 'approvato')
    .order('mese', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const storico = (data ?? []).map(c => {
    const approvatore = c.profiles as unknown as { nome: string; cognome: string } | null
    return {
      id: c.id,
      mese: c.mese,
      approvato_at: c.approvato_at,
      approvato_da_nome: approvatore ? `${approvatore.nome} ${approvatore.cognome}` : null,
    }
  })

  return NextResponse.json({ storico })
}
