import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()

  // Controllo sovrapposizione (escludo il turno corrente)
  if (body.dipendente_id && body.data) {
    const { data: esistente } = await supabase
      .from('turni')
      .select('id')
      .eq('dipendente_id', body.dipendente_id)
      .eq('data', body.data)
      .neq('id', params.id)
      .maybeSingle()
    if (esistente) return NextResponse.json({ error: 'Il dipendente ha già un turno in questa data.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('turni')
    .update({
      template_id: body.template_id ?? null,
      data: body.data,
      ora_inizio: body.ora_inizio,
      ora_fine: body.ora_fine,
      posto_id: body.posto_id ?? null,
      note: body.note ?? null,
    })
    .eq('id', params.id)
    .select('*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('turni').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
