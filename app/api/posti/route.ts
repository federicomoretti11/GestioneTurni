import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const tenantId = requireTenantId()
  const { data, error } = await supabase
    .from('posti_di_servizio')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const { data: profilo } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profilo?.ruolo !== 'admin' && profilo?.ruolo !== 'manager') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const tenantId = requireTenantId()
  const body = await request.json()
  const { data, error } = await supabase
    .from('posti_di_servizio')
    .insert({
      nome: body.nome,
      descrizione: body.descrizione ?? null,
      latitudine: body.latitudine ?? null,
      longitudine: body.longitudine ?? null,
      raggio_metri: body.raggio_metri ?? 200,
      geo_check_abilitato: body.geo_check_abilitato ?? false,
      tenant_id: tenantId,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
