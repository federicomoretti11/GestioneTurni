import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAccesso() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { ruolo: data.ruolo as string }
}

const GIORNI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica']

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { data } = await createAdminClient()
    .from('staffing_fabbisogno')
    .select('giorno_settimana, min_persone')
    .eq('posto_id', params.id)
    .eq('tenant_id', tenantId)
    .order('giorno_settimana')

  const map = new Map((data ?? []).map(r => [r.giorno_settimana as number, r.min_persone as number]))
  const fabbisogno = Array.from({ length: 7 }, (_, i) => ({
    giorno_settimana: i,
    label: GIORNI[i],
    min_persone: map.get(i) ?? 0,
  }))

  return NextResponse.json(fabbisogno)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  if (ctx.ruolo !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const tenantId = requireTenantId()
  const { fabbisogno } = await req.json() as {
    fabbisogno: Array<{ giorno_settimana: number; min_persone: number }>
  }

  const rows = fabbisogno.map(f => ({
    tenant_id: tenantId,
    posto_id: params.id,
    giorno_settimana: f.giorno_settimana,
    min_persone: Math.max(0, f.min_persone),
  }))

  const { error } = await createAdminClient()
    .from('staffing_fabbisogno')
    .upsert(rows, { onConflict: 'tenant_id,posto_id,giorno_settimana' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
