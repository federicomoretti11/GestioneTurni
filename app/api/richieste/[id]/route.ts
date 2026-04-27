// app/api/richieste/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateStatoTransition } from '@/lib/richieste/validations'
import {
  notificaRichiestaApprovata,
  notificaRichiestaApprovataManager,
  notificaRichiestaRifiutata,
  notificaRichiestaCancellata,
} from '@/lib/richieste/notifiche'
import type { AzioneRichiesta, RuoloUtente } from '@/lib/types'

const SELECT = `*, profile:profiles!richieste_dipendente_id_fkey(id, nome, cognome, ruolo),
  turno:turni(id, data, ora_inizio, ora_fine)`

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('richieste').select(SELECT).eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profilo } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  const ruolo = profilo?.ruolo as RuoloUtente

  const body: { azione: AzioneRichiesta; motivazione?: string; _sovrascrivi_conflitti?: boolean }
    = await request.json()
  const { azione, motivazione } = body

  // Leggi richiesta corrente
  const { data: richiesta, error: fetchErr } = await supabase
    .from('richieste').select('*').eq('id', params.id).single()
  if (fetchErr || !richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  // Mappa azione → nuovo stato
  const mappaStato: Record<AzioneRichiesta, string> = {
    cancella:  'annullata',
    approva:   ruolo === 'admin' && richiesta.stato === 'pending' ? 'approvata' : 'approvata_manager',
    rifiuta:   'rifiutata',
    convalida: 'approvata',
  }
  const nuovoStato = mappaStato[azione] as any

  // Valida transizione
  const err = validateStatoTransition(richiesta.stato, nuovoStato, ruolo)
  if (err) return NextResponse.json({ error: err }, { status: 422 })

  // Motivazione obbligatoria su rifiuto
  if (azione === 'rifiuta' && (!motivazione || motivazione.trim().length < 5)) {
    return NextResponse.json({ error: 'Motivazione obbligatoria (min 5 caratteri)' }, { status: 422 })
  }

  // Campi da aggiornare
  const aggiornamenti: Record<string, unknown> = { stato: nuovoStato }
  if (azione === 'rifiuta') aggiornamenti.motivazione_decisione = motivazione
  if (ruolo === 'manager' && azione === 'approva') {
    aggiornamenti.manager_id = user.id
    aggiornamenti.manager_decisione_at = new Date().toISOString()
  }
  if (ruolo === 'admin' && (azione === 'approva' || azione === 'convalida' || azione === 'rifiuta')) {
    aggiornamenti.admin_id = user.id
    aggiornamenti.admin_decisione_at = new Date().toISOString()
  }

  // Nota: conflict detection per turni viene aggiunta in Fase 4 (Task 14)
  // Per ora la PATCH aggiorna lo stato senza creare turni

  const { data: updated, error: updateErr } = await supabase
    .from('richieste')
    .update(aggiornamenti)
    .eq('id', params.id)
    .select(SELECT)
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Notifiche non-bloccanti
  const nomeRichiedente = (updated.profile as any)
    ? `${(updated.profile as any).nome} ${(updated.profile as any).cognome}`
    : 'Dipendente'

  if (nuovoStato === 'approvata_manager') {
    notificaRichiestaApprovataManager({ tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, nomeDipendente: nomeRichiedente })
  } else if (nuovoStato === 'approvata') {
    notificaRichiestaApprovata({ dipendenteId: richiesta.dipendente_id, tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, dataFine: richiesta.data_fine })
  } else if (nuovoStato === 'rifiutata') {
    notificaRichiestaRifiutata({ dipendenteId: richiesta.dipendente_id, tipo: richiesta.tipo, motivazione: motivazione! })
  } else if (nuovoStato === 'annullata') {
    notificaRichiestaCancellata({ tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, nomeDipendente: nomeRichiedente })
  }

  return NextResponse.json(updated)
}
