import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { notificaTurniPubblicati } from '@/lib/notifiche'
import { sendEmailTurniPubblicati } from '@/lib/email'

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

  // Legge i turni bozza nel periodo con dettagli per le email.
  const { data: bozze, error: readErr } = await admin
    .from('turni')
    .select('dipendente_id, data, ora_inizio, ora_fine')
    .eq('stato', 'bozza')
    .gte('data', data_inizio)
    .lte('data', data_fine)
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!bozze || bozze.length === 0) {
    return NextResponse.json({ confermati: 0, dipendenti: 0 })
  }

  // Raggruppa per dipendente
  const turniPerDipendente: Record<string, Array<{ data: string; ora_inizio: string; ora_fine: string }>> = {}
  for (const t of bozze) {
    if (!turniPerDipendente[t.dipendente_id]) turniPerDipendente[t.dipendente_id] = []
    turniPerDipendente[t.dipendente_id].push({ data: t.data, ora_inizio: t.ora_inizio, ora_fine: t.ora_fine })
  }
  const dipendenteIds = Object.keys(turniPerDipendente)
  const conteggio: Record<string, number> = Object.fromEntries(
    dipendenteIds.map(id => [id, turniPerDipendente[id].length])
  )

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

  // Email non-bloccante per ogni dipendente con il riepilogo dei propri turni
  for (const dipendenteId of dipendenteIds) {
    if (dipendenteId === user.id) continue
    const { data: userData } = await admin.auth.admin.getUserById(dipendenteId)
    const email = userData?.user?.email
    if (email) {
      sendEmailTurniPubblicati({
        toEmail: email,
        dataInizio: data_inizio,
        dataFine: data_fine,
        turni: turniPerDipendente[dipendenteId],
      })
    }
  }

  return NextResponse.json({ confermati: bozze.length, dipendenti: dipendenteIds.length })
}
