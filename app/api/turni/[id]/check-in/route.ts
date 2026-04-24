import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { notificaCheckIn } from '@/lib/notifiche'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: turno, error: readErr } = await admin
    .from('turni')
    .select('id, dipendente_id, data, stato, ora_ingresso_effettiva, profile:profiles!turni_dipendente_id_fkey(nome, cognome)')
    .eq('id', params.id)
    .single()
  if (readErr || !turno) return NextResponse.json({ error: 'Turno non trovato' }, { status: 404 })
  // 404 sulle bozze per non rivelarne l'esistenza al dipendente.
  if (turno.stato === 'bozza') return NextResponse.json({ error: 'Turno non trovato' }, { status: 404 })
  if (turno.dipendente_id !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  if (turno.ora_ingresso_effettiva) return NextResponse.json({ error: 'Check-in già effettuato' }, { status: 409 })

  const now = new Date().toISOString()
  const { data: updated, error: updErr } = await admin
    .from('turni')
    .update({ ora_ingresso_effettiva: now })
    .eq('id', params.id)
    .select('*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo)')
    .single()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  const profile = (turno.profile as unknown as { nome: string; cognome: string } | null)
  await notificaCheckIn({
    turnoId: turno.id,
    dataTurno: turno.data,
    oraIngressoISO: now,
    nomeDipendente: profile ? `${profile.nome} ${profile.cognome}` : 'Dipendente',
  })

  return NextResponse.json(updated)
}
