import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notificaTurnoAssegnato } from '@/lib/notifiche'
import { queryTurni, type FiltroTurni } from '@/lib/supabase/turni'
import { logAzione } from '@/lib/audit'

const SELECT = '*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  const ruolo = (profile as { ruolo?: string } | null)?.ruolo

  const { searchParams } = new URL(request.url)
  const dataInizio = searchParams.get('data_inizio')
  const dataFine = searchParams.get('data_fine')
  const statoParam = searchParams.get('stato')
  const filtro: FiltroTurni = statoParam === 'bozza' ? 'bozza' : statoParam === 'tutti' ? 'tutti' : 'confermati'

  let query = queryTurni(supabase, filtro, SELECT).order('data')
  if (dataInizio) query = query.gte('data', dataInizio)
  if (dataFine) query = query.lte('data', dataFine)
  if (ruolo === 'dipendente') query = query.eq('dipendente_id', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()
  const stato: 'bozza' | 'confermato' = body.stato === 'bozza' ? 'bozza' : 'confermato'

  // Controllo sovrapposizione STESSO STATO — bozza e confermato vivono in namespace distinti
  const { data: esistente } = await supabase
    .from('turni')
    .select('id')
    .eq('dipendente_id', body.dipendente_id)
    .eq('data', body.data)
    .eq('stato', stato)
    .maybeSingle()
  if (esistente) {
    return NextResponse.json(
      { error: `Il dipendente ha già un turno ${stato === 'bozza' ? 'in bozza' : 'ufficiale'} in questa data.` },
      { status: 409 }
    )
  }

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
      stato,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Nessuna notifica sulle bozze: i dipendenti non sanno nulla finché non confermi.
  if (stato === 'confermato') {
    await notificaTurnoAssegnato({
      turnoId: data.id,
      dipendenteId: data.dipendente_id,
      data: data.data,
      oraInizio: data.ora_inizio,
      oraFine: data.ora_fine,
      actorId: user!.id,
    })
  }

  logAzione({
    tabella: 'turni', recordId: data.id, azione: 'creato', utenteId: user!.id,
    dettagli: { dipendente_id: data.dipendente_id, data: data.data, stato },
  })

  return NextResponse.json(data, { status: 201 })
}
