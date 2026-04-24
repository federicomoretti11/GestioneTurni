import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { notificaTurniPubblicati } from '@/lib/notifiche'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profile?.ruolo !== 'admin') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { data_inizio, data_fine } = body
  if (typeof data_inizio !== 'string' || typeof data_fine !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data_inizio) || !/^\d{4}-\d{2}-\d{2}$/.test(data_fine)) {
    return NextResponse.json({ error: 'data_inizio e data_fine (YYYY-MM-DD) richiesti' }, { status: 400 })
  }
  if (data_fine < data_inizio) {
    return NextResponse.json({ error: 'data_fine precede data_inizio' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Conta i turni bozza nel periodo, raggruppati per dipendente.
  const { data: bozze, error: readErr } = await admin
    .from('turni')
    .select('dipendente_id')
    .eq('stato', 'bozza')
    .gte('data', data_inizio)
    .lte('data', data_fine)
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!bozze || bozze.length === 0) {
    return NextResponse.json({ confermati: 0, dipendenti: 0 })
  }

  const conteggio: Record<string, number> = {}
  for (const t of bozze) {
    conteggio[t.dipendente_id] = (conteggio[t.dipendente_id] ?? 0) + 1
  }
  const dipendenteIds = Object.keys(conteggio)

  const { error: updErr } = await admin
    .from('turni')
    .update({ stato: 'confermato' })
    .eq('stato', 'bozza')
    .gte('data', data_inizio)
    .lte('data', data_fine)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await notificaTurniPubblicati({
    dipendenteIds,
    dataInizio: data_inizio,
    dataFine: data_fine,
    actorId: user.id,
    conteggioPerDipendente: conteggio,
  })

  return NextResponse.json({ confermati: bozze.length, dipendenti: dipendenteIds.length })
}
