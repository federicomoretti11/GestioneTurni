import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notificaTurnoModificato, notificaTurnoEliminato } from '@/lib/notifiche'
import { logAzione } from '@/lib/audit'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()

  // Snapshot prima della modifica per confronto
  const { data: prev } = await supabase
    .from('turni')
    .select('template_id, data, ora_inizio, ora_fine, posto_id, dipendente_id, stato')
    .eq('id', params.id)
    .single()

  // Controllo sovrapposizione nello STESSO stato (escludo il turno corrente)
  if (body.dipendente_id && body.data && prev) {
    const { data: esistente } = await supabase
      .from('turni')
      .select('id')
      .eq('dipendente_id', body.dipendente_id)
      .eq('data', body.data)
      .eq('stato', prev.stato)
      .neq('id', params.id)
      .maybeSingle()
    if (esistente) {
      return NextResponse.json(
        { error: `Il dipendente ha già un turno ${prev.stato === 'bozza' ? 'in bozza' : 'ufficiale'} in questa data.` },
        { status: 409 }
      )
    }
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

  if (prev?.stato === 'confermato') {
    await notificaTurnoModificato({
      turnoId: data.id,
      dipendenteId: data.dipendente_id,
      data: data.data,
      oraInizio: data.ora_inizio,
      oraFine: data.ora_fine,
      actorId: user!.id,
    })
  }

  logAzione({
    tabella: 'turni', recordId: params.id, azione: 'modificato', utenteId: user!.id,
    dettagli: { data: body.data, ora_inizio: body.ora_inizio, ora_fine: body.ora_fine },
  })

  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: turno } = await supabase
    .from('turni')
    .select('dipendente_id, data, stato')
    .eq('id', params.id)
    .single()

  const { error } = await supabase.from('turni').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (turno && turno.stato === 'confermato') {
    await notificaTurnoEliminato({
      dipendenteId: turno.dipendente_id,
      data: turno.data,
      actorId: user!.id,
    })
  }

  logAzione({
    tabella: 'turni', recordId: params.id, azione: 'eliminato', utenteId: user!.id,
    dettagli: { dipendente_id: turno?.dipendente_id, data: turno?.data, stato: turno?.stato },
  })

  return new NextResponse(null, { status: 204 })
}
