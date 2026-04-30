import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profile?.ruolo !== 'admin') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })

  const tenantId = requireTenantId()
  const body = await request.json().catch(() => ({}))
  const { data_inizio, data_fine } = body
  const re = /^\d{4}-\d{2}-\d{2}$/
  if (!re.test(data_inizio) || !re.test(data_fine)) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
  }
  if (data_fine < data_inizio) {
    return NextResponse.json({ error: 'data_fine precede data_inizio' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('turni')
    .delete()
    .eq('stato', 'bozza')
    .eq('tenant_id', tenantId)
    .gte('data', data_inizio)
    .lte('data', data_fine)
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ eliminati: data?.length ?? 0 })
}
