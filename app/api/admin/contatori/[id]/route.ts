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

function calcolaOrePermesso(tipo: string | null, oraInizio: string | null, oraFine: string | null): number {
  if (tipo === 'giornata') return 8
  if (tipo === 'mezza_mattina' || tipo === 'mezza_pomeriggio') return 4
  if (tipo === 'ore' && oraInizio && oraFine) {
    const [hI, mI] = oraInizio.slice(0, 5).split(':').map(Number)
    const [hF, mF] = oraFine.slice(0, 5).split(':').map(Number)
    return Math.max(0, (hF * 60 + mF - hI * 60 - mI) / 60)
  }
  return 0
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { searchParams } = new URL(req.url)
  const anno = parseInt(searchParams.get('anno') ?? String(new Date().getFullYear()), 10)

  const admin = createAdminClient()

  const [{ data: contatore }, { data: richieste }] = await Promise.all([
    admin
      .from('contatori_ferie')
      .select('*')
      .eq('dipendente_id', params.id)
      .eq('tenant_id', tenantId)
      .eq('anno', anno)
      .single(),
    admin
      .from('richieste')
      .select('tipo, permesso_tipo, ora_inizio, ora_fine, data_inizio, data_fine')
      .eq('dipendente_id', params.id)
      .eq('tenant_id', tenantId)
      .eq('stato', 'approvata')
      .in('tipo', ['ferie', 'permesso'])
      .gte('data_inizio', `${anno}-01-01`)
      .lte('data_inizio', `${anno}-12-31`),
  ])

  const ferie_usate = (richieste ?? [])
    .filter(r => r.tipo === 'ferie')
    .reduce((acc, r) => {
      const inizio = new Date(r.data_inizio as string)
      const fine = r.data_fine ? new Date(r.data_fine as string) : inizio
      return acc + Math.round((fine.getTime() - inizio.getTime()) / 86400000) + 1
    }, 0)
  const permesso_usate = (richieste ?? [])
    .filter(r => r.tipo === 'permesso')
    .reduce((acc, r) => acc + calcolaOrePermesso(r.permesso_tipo, r.ora_inizio, r.ora_fine), 0)

  return NextResponse.json({
    anno,
    ferie_giorni: contatore?.ferie_giorni ?? 0,
    permesso_ore: contatore?.permesso_ore ?? 0,
    rol_ore: contatore?.rol_ore ?? 0,
    ferie_usate,
    permesso_usate,
    rol_usate: 0,
  })
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
    anno: number
    ferie_giorni: number
    permesso_ore: number
    rol_ore: number
  }

  const { data, error } = await createAdminClient()
    .from('contatori_ferie')
    .upsert({
      tenant_id: tenantId,
      dipendente_id: params.id,
      anno: body.anno,
      ferie_giorni: body.ferie_giorni,
      permesso_ore: body.permesso_ore,
      rol_ore: body.rol_ore,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,dipendente_id,anno' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
