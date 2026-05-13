import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function getUtenteAutenticato() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  if (!data) return null
  return { id: user.id, ruolo: data.ruolo as string }
}

export async function GET(req: Request) {
  const utente = await getUtenteAutenticato()
  if (!utente) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tenantId = requireTenantId()
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const admin = createAdminClient()

  let query = admin
    .from('indisponibilita')
    .select('id, dipendente_id, data_inizio, data_fine, motivo')
    .eq('tenant_id', tenantId)
    .order('data_inizio', { ascending: true })

  // Dipendente vede solo le proprie
  if (utente.ruolo !== 'admin' && utente.ruolo !== 'manager') {
    query = query.eq('dipendente_id', utente.id)
  }

  // Filtri date
  if (from) {
    query = query.gte('data_fine', from)
  }
  if (to) {
    query = query.lte('data_inizio', to)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const utente = await getUtenteAutenticato()
  if (!utente) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tenantId = requireTenantId()
  const body = await req.json() as {
    dipendente_id?: string
    data_inizio: string
    data_fine: string
    motivo?: string
  }

  // Validazione campi obbligatori
  if (!body.data_inizio || !body.data_fine) {
    return NextResponse.json(
      { error: 'data_inizio e data_fine sono obbligatori' },
      { status: 400 }
    )
  }

  if (body.data_fine < body.data_inizio) {
    return NextResponse.json(
      { error: 'data_fine deve essere >= data_inizio' },
      { status: 400 }
    )
  }

  // Determina il dipendente_id
  const targetId = body.dipendente_id ?? utente.id

  // Solo admin può creare per altri dipendenti
  if (targetId !== utente.id && utente.ruolo !== 'admin') {
    return NextResponse.json(
      { error: 'Non autorizzato a creare indisponibilità per altri dipendenti' },
      { status: 403 }
    )
  }

  const { data, error } = await createAdminClient()
    .from('indisponibilita')
    .insert({
      tenant_id: tenantId,
      dipendente_id: targetId,
      data_inizio: body.data_inizio,
      data_fine: body.data_fine,
      motivo: body.motivo ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
