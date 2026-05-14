// app/api/richieste/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateLeadTime } from '@/lib/richieste/validations'
import {
  notificaRichiestaCreata,
  notificaMalattiaComunicata,
} from '@/lib/richieste/notifiche'
import { requireTenantId } from '@/lib/tenant'

const SELECT = `*, profile:profiles!richieste_dipendente_id_fkey(id, nome, cognome, ruolo),
  turno:turni(id, data, ora_inizio, ora_fine)`

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const stato = searchParams.get('stato')
  const dipendente_id = searchParams.get('dipendente_id')
  const mese = searchParams.get('mese') // "YYYY-MM"

  let query = supabase.from('richieste').select(SELECT)

  if (profile?.ruolo === 'dipendente') {
    query = query.eq('dipendente_id', user.id)
  } else {
    if (dipendente_id) query = query.eq('dipendente_id', dipendente_id)
  }
  if (tipo) query = query.eq('tipo', tipo)
  if (stato) query = query.eq('stato', stato)
  if (mese) {
    query = query
      .gte('data_inizio', `${mese}-01`)
      .lte('data_inizio', `${mese}-31`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tenantId = requireTenantId()
  let body: { tipo?: string; data_inizio?: string; data_fine?: string; permesso_tipo?: string; ora_inizio?: string; ora_fine?: string; turno_id?: string; note_dipendente?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON non valido' }, { status: 400 }) }
  const { tipo, data_inizio, data_fine, permesso_tipo, ora_inizio, ora_fine,
          turno_id, note_dipendente } = body

  if (!tipo) return NextResponse.json({ error: 'tipo obbligatorio' }, { status: 400 })

  const TIPI_PERMESSO_VALIDI = ['ferie', 'permesso', 'malattia', 'cambio_turno', 'sblocco_checkin']
  if (permesso_tipo && !TIPI_PERMESSO_VALIDI.includes(permesso_tipo)) {
    return NextResponse.json({ error: 'Tipo permesso non valido' }, { status: 400 })
  }

  // Validazione lead time (non si applica a sblocco_checkin)
  if (tipo !== 'sblocco_checkin') {
    const leadError = validateLeadTime(tipo as import('@/lib/types').TipoRichiesta, data_inizio ?? '')
    if (leadError) return NextResponse.json({ error: leadError }, { status: 422 })
  }

  // Validazioni specifiche per tipo
  if (tipo === 'cambio_turno' && !turno_id) {
    return NextResponse.json({ error: 'turno_id obbligatorio per cambio turno' }, { status: 422 })
  }
  if (tipo === 'cambio_turno' && !note_dipendente?.trim()) {
    return NextResponse.json({ error: 'La motivazione è obbligatoria per il cambio turno' }, { status: 422 })
  }
  if (tipo === 'sblocco_checkin' && !turno_id) {
    return NextResponse.json({ error: 'turno_id obbligatorio per sblocco check-in' }, { status: 422 })
  }
  if (tipo === 'sblocco_checkin' && !note_dipendente?.trim()) {
    return NextResponse.json({ error: 'La motivazione è obbligatoria per lo sblocco' }, { status: 422 })
  }

  if (body.turno_id) {
    const { data: turno } = await supabase
      .from('turni')
      .select('id')
      .eq('id', body.turno_id)
      .eq('dipendente_id', user.id)
      .single()
    if (!turno) return NextResponse.json({ error: 'Turno non trovato' }, { status: 404 })
  }

  // Malattia → stato = 'comunicata' direttamente
  const statoIniziale = tipo === 'malattia' ? 'comunicata' : 'pending'
  const dataInizioEffettiva = data_inizio ?? new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('richieste')
    .insert({
      dipendente_id: user.id,
      tipo,
      data_inizio: dataInizioEffettiva,
      data_fine: data_fine ?? null,
      permesso_tipo: permesso_tipo ?? null,
      ora_inizio: ora_inizio ?? null,
      ora_fine: ora_fine ?? null,
      turno_id: turno_id ?? null,
      note_dipendente: note_dipendente ?? null,
      stato: statoIniziale,
      tenant_id: tenantId,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifiche non-bloccanti
  const { data: profilo } = await supabase
    .from('profiles').select('nome, cognome').eq('id', user.id).single()
  const nome = profilo ? `${profilo.nome} ${profilo.cognome}` : 'Dipendente'

  if (tipo === 'malattia') {
    await notificaMalattiaComunicata({ tipo: 'malattia', dataInizio: data_inizio ?? '', nomeDipendente: nome, tenantId })
  } else {
    await notificaRichiestaCreata({ tipo: tipo as import('@/lib/types').TipoRichiesta, dataInizio: data_inizio ?? '', dataFine: data_fine ?? null, nomeDipendente: nome, tenantId })
  }

  return NextResponse.json(data, { status: 201 })
}
