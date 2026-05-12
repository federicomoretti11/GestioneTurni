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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { data } = await createAdminClient()
    .from('contratti_dipendenti')
    .select('*')
    .eq('dipendente_id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  return NextResponse.json(data ?? null)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  if (ctx.ruolo !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const tenantId = requireTenantId()
  const body = await req.json() as {
    tipo: string
    ore_settimanali: number
    ore_giornaliere: number
    data_inizio: string
  }

  const tipiValidi = ['full_time', 'part_time', 'turni_fissi', 'turni_rotanti']
  if (!tipiValidi.includes(body.tipo)) {
    return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('contratti_dipendenti')
    .upsert({
      tenant_id: tenantId,
      dipendente_id: params.id,
      tipo: body.tipo,
      ore_settimanali: body.ore_settimanali,
      ore_giornaliere: body.ore_giornaliere,
      data_inizio: body.data_inizio,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,dipendente_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
