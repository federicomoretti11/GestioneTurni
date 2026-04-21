import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const dataInizio = searchParams.get('data_inizio')
  const dataFine = searchParams.get('data_fine')

  let query = supabase
    .from('turni')
    .select('*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)')
    .order('data')

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
  return NextResponse.json(data, { status: 201 })
}
