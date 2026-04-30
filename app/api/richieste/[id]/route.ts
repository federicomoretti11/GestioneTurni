// app/api/richieste/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailRichiestaApprovata, sendEmailRichiestaRifiutata } from '@/lib/email'
import { NextResponse } from 'next/server'
import { validateStatoTransition } from '@/lib/richieste/validations'
import { checkConflitti, createTurniDaRichiesta } from '@/lib/richieste/turni'
import {
  notificaRichiestaApprovata,
  notificaRichiestaApprovataManager,
  notificaRichiestaRifiutata,
  notificaRichiestaCancellata,
  notificaSbloccoApprovato,
} from '@/lib/richieste/notifiche'
import type { AzioneRichiesta, RuoloUtente, StatoRichiesta, Profile } from '@/lib/types'
import { logAzione } from '@/lib/audit'

const SELECT = `*, profile:profiles!richieste_dipendente_id_fkey(id, nome, cognome, ruolo),
  turno:turni(id, data, ora_inizio, ora_fine)`

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

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

  const body: { azione: AzioneRichiesta; motivazione?: string; sovrascrivi_conflitti?: boolean }
    = await request.json()
  const { azione, motivazione, sovrascrivi_conflitti } = body

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
  const nuovoStato = mappaStato[azione] as StatoRichiesta

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

  // Controlla conflitti prima di approvare definitivamente (non per cambio_turno né sblocco_checkin)
  if (nuovoStato === 'approvata' && richiesta.tipo !== 'cambio_turno' && richiesta.tipo !== 'sblocco_checkin') {
    const conflitti = await checkConflitti(
      richiesta.dipendente_id,
      richiesta.data_inizio,
      richiesta.data_fine ?? richiesta.data_inizio,
      supabase
    )
    if (conflitti.length > 0 && sovrascrivi_conflitti === undefined) {
      return NextResponse.json({ conflict: true, conflitti }, { status: 409 })
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('richieste')
    .update(aggiornamenti)
    .eq('id', params.id)
    .select(SELECT)
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Sblocco check-in: scrivi token 30 min sul turno
  if (nuovoStato === 'approvata' && richiesta.tipo === 'sblocco_checkin' && richiesta.turno_id) {
    const validoFino = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await createAdminClient()
      .from('turni')
      .update({ sblocco_checkin_valido_fino: validoFino })
      .eq('id', richiesta.turno_id)
    notificaSbloccoApprovato({ dipendenteId: richiesta.dipendente_id })
  }

  // Crea turni automatici su approvazione finale (non per cambio_turno né sblocco_checkin)
  let avviso: string | undefined
  if (nuovoStato === 'approvata' && richiesta.tipo !== 'cambio_turno' && richiesta.tipo !== 'sblocco_checkin') {
    const adminSupabase = createAdminClient()
    const risultato = await createTurniDaRichiesta(
      { ...richiesta, stato: nuovoStato },
      sovrascrivi_conflitti ?? false,
      user.id,
      adminSupabase
    )
    if (!risultato.ok) {
      await supabase.from('richieste').update({ stato: richiesta.stato }).eq('id', params.id)
      return NextResponse.json({ error: risultato.error }, { status: 500 })
    }
    if (risultato.skipped) {
      avviso = 'Permesso ore approvato. Il calendario non è stato modificato automaticamente — gestisci il turno a mano se necessario.'
    }
  }

  // Notifiche non-bloccanti
  const profile = updated.profile as Profile | undefined
  const nomeRichiedente = profile ? `${profile.nome} ${profile.cognome}` : 'Dipendente'

  if (nuovoStato === 'approvata_manager') {
    notificaRichiestaApprovataManager({ tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, nomeDipendente: nomeRichiedente })
  } else if (nuovoStato === 'approvata') {
    notificaRichiestaApprovata({ dipendenteId: richiesta.dipendente_id, tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, dataFine: richiesta.data_fine })
  } else if (nuovoStato === 'rifiutata') {
    notificaRichiestaRifiutata({ dipendenteId: richiesta.dipendente_id, tipo: richiesta.tipo, motivazione: motivazione! })
  } else if (nuovoStato === 'annullata') {
    notificaRichiestaCancellata({ tipo: richiesta.tipo, dataInizio: richiesta.data_inizio, nomeDipendente: nomeRichiedente })
  }

  // Email non-bloccante (sandbox: arriva solo all'indirizzo Resend registrato)
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient.auth.admin.getUserById(richiesta.dipendente_id)
  const emailDipendente = userData?.user?.email
  if (emailDipendente) {
    if (nuovoStato === 'approvata') {
      sendEmailRichiestaApprovata({
        toEmail: emailDipendente,
        tipo: richiesta.tipo,
        dataInizio: richiesta.data_inizio,
        dataFine: richiesta.data_fine,
      })
    } else if (nuovoStato === 'rifiutata' && motivazione) {
      sendEmailRichiestaRifiutata({
        toEmail: emailDipendente,
        tipo: richiesta.tipo,
        motivazione,
      })
    }
  }

  logAzione({
    tabella: 'richieste', recordId: params.id, azione: nuovoStato, utenteId: user.id,
    dettagli: { tipo: richiesta.tipo, da_stato: richiesta.stato, motivazione: motivazione ?? null },
  })

  return NextResponse.json(avviso ? { ...updated, avviso } : updated)
}
