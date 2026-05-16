import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notificaTurnoAssegnato } from '@/lib/notifiche'
import { queryTurni, type FiltroTurni } from '@/lib/supabase/turni'
import { logAzione } from '@/lib/audit'
import { requireTenantId } from '@/lib/tenant'

const SELECT = '*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), dipendente_custom:dipendenti_custom!turni_dipendente_custom_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)'

export async function GET(request: Request) {
  try {
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
    if (error) {
      console.error('[turni GET] supabase error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (e) {
    console.error('[turni GET] uncaught exception:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const tenantId = requireTenantId()
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON non valido' }, { status: 400 }) }

  const dipId = body.dipendente_id as string | null | undefined
  const dipCustomId = body.dipendente_custom_id as string | null | undefined
  const stato: 'bozza' | 'confermato' = body.stato === 'bozza' ? 'bozza' : 'confermato'

  if ((!dipId && !dipCustomId) || (dipId && dipCustomId)) {
    return NextResponse.json(
      { error: 'Specificare esattamente uno tra dipendente_id e dipendente_custom_id' },
      { status: 400 }
    )
  }

  // Controllo sovrapposizione per lo stesso stato
  let sovQuery = supabase.from('turni').select('id').eq('data', body.data as string).eq('stato', stato)
  if (dipId) sovQuery = sovQuery.eq('dipendente_id', dipId)
  else sovQuery = sovQuery.eq('dipendente_custom_id', dipCustomId!)
  const { data: esistente } = await sovQuery.maybeSingle()
  if (esistente) {
    return NextResponse.json(
      { error: `Il dipendente ha già un turno ${stato === 'bozza' ? 'in bozza' : 'ufficiale'} in questa data.` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('turni')
    .insert({
      dipendente_id: dipId ?? null,
      dipendente_custom_id: dipCustomId ?? null,
      template_id: body.template_id ?? null,
      data: body.data,
      ora_inizio: body.ora_inizio,
      ora_fine: body.ora_fine,
      posto_id: body.posto_id ?? null,
      note: body.note ?? null,
      creato_da: user!.id,
      stato,
      tenant_id: tenantId,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifiche solo per dipendenti reali con account
  if (stato === 'confermato' && dipId) {
    await notificaTurnoAssegnato({
      turnoId: data.id,
      dipendenteId: dipId,
      data: data.data,
      oraInizio: data.ora_inizio,
      oraFine: data.ora_fine,
      actorId: user!.id,
      tenantId,
    })
  }

  logAzione({
    tabella: 'turni', recordId: data.id, azione: 'creato', utenteId: user!.id,
    dettagli: { dipendente_id: dipId ?? null, dipendente_custom_id: dipCustomId ?? null, data: data.data, stato },
    tenantId,
  })

  return NextResponse.json(data, { status: 201 })
}
