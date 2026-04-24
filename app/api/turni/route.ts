import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notificaTurnoAssegnato } from '@/lib/notifiche'
import { queryTurni, type FiltroTurni } from '@/lib/supabase/turni'

const SELECT = '*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const dataInizio = searchParams.get('data_inizio')
  const dataFine = searchParams.get('data_fine')
  const statoParam = searchParams.get('stato')
  const filtro: FiltroTurni = statoParam === 'bozza' ? 'bozza' : statoParam === 'tutti' ? 'tutti' : 'confermati'

  let query = queryTurni(supabase, filtro, SELECT).order('data')
  if (dataInizio) query = query.gte('data', dataInizio)
  if (dataFine) query = query.lte('data', dataFine)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()

  // Controllo sovrapposizione
  const { data: esistente } = await supabase
    .from('turni')
    .select('id')
    .eq('dipendente_id', body.dipendente_id)
    .eq('data', body.data)
    .maybeSingle()
  if (esistente) return NextResponse.json({ error: 'Il dipendente ha già un turno in questa data.' }, { status: 409 })

  const { data, error } = await supabase
    .from('turni')
    .insert({
      dipendente_id: body.dipendente_id,
      template_id: body.template_id ?? null,
      data: body.data,
      ora_inizio: body.ora_inizio,
      ora_fine: body.ora_fine,
      posto_id: body.posto_id ?? null,
      note: body.note ?? null,
      creato_da: user!.id,
    })
    .select('*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notificaTurnoAssegnato({
    turnoId: data.id,
    dipendenteId: data.dipendente_id,
    data: data.data,
    oraInizio: data.ora_inizio,
    oraFine: data.ora_fine,
    actorId: user!.id,
  })

  return NextResponse.json(data, { status: 201 })
}
