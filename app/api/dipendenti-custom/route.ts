import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tenantId = requireTenantId()
  const { data, error } = await supabase
    .from('dipendenti_custom')
    .select('id, nome, cognome')
    .eq('tenant_id', tenantId)
    .eq('attivo', true)
    .order('cognome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'manager'].includes(profile.ruolo)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const tenantId = requireTenantId()
  let body: { nome?: string; cognome?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  const nome = body.nome?.trim()
  const cognome = body.cognome?.trim()
  if (!nome || !cognome) {
    return NextResponse.json({ error: 'nome e cognome sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('dipendenti_custom')
    .insert({ nome, cognome, tenant_id: tenantId })
    .select('id, nome, cognome')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
