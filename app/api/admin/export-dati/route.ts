import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin') return null
  return { supabase }
}

export async function GET(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')

  if (tipo === 'dipendenti') {
    const { data, error } = await ctx.supabase
      .from('profiles')
      .select('nome, cognome, ruolo, attivo, created_at')
      .eq('tenant_id', tenantId)
      .order('cognome')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (tipo === 'richieste') {
    const { data, error } = await ctx.supabase
      .from('richieste')
      .select('tipo, data_inizio, data_fine, stato, note, created_at, profile:profiles!richieste_dipendente_id_fkey(nome, cognome)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'tipo non valido (dipendenti|richieste)' }, { status: 400 })
}
