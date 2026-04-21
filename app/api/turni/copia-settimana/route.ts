import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data_inizio_origine } = await request.json()

  // I 7 giorni di origine e destinazione
  const origine = new Date(data_inizio_origine)
  const destinazione = new Date(origine)
  destinazione.setDate(origine.getDate() + 7)

  const fineOrigine = new Date(origine); fineOrigine.setDate(origine.getDate() + 6)

  const origineDateStr = origine.toISOString().slice(0, 10)
  const fineOrigineDateStr = fineOrigine.toISOString().slice(0, 10)

  // Carica turni della settimana origine
  const { data: turniOrigine, error } = await supabase
    .from('turni')
    .select('dipendente_id, template_id, data, ora_inizio, ora_fine, posto_id, note')
    .gte('data', origineDateStr)
    .lte('data', fineOrigineDateStr)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!turniOrigine?.length) return NextResponse.json({ copiati: 0 })

  // Calcola date destinazione e verifica quali esistono già
  const nuoviTurni = turniOrigine.map(t => {
    const dataOrig = new Date(t.data)
    const dataDest = new Date(dataOrig)
    dataDest.setDate(dataOrig.getDate() + 7)
    return { ...t, data: dataDest.toISOString().slice(0, 10), creato_da: user!.id }
  })

  const dateDest = Array.from(new Set(nuoviTurni.map(t => t.data)))
  const dipIdsDest = Array.from(new Set(nuoviTurni.map(t => t.dipendente_id)))

  const { data: esistenti } = await supabase
    .from('turni')
    .select('dipendente_id, data')
    .in('data', dateDest)
    .in('dipendente_id', dipIdsDest)

  const chiaveEsistenti = new Set((esistenti ?? []).map(e => `${e.dipendente_id}_${e.data}`))

  const daCopmare = nuoviTurni.filter(t => !chiaveEsistenti.has(`${t.dipendente_id}_${t.data}`))

  if (!daCopmare.length) return NextResponse.json({ copiati: 0 })

  const { error: insertError } = await supabase.from('turni').insert(daCopmare)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ copiati: daCopmare.length })
}
