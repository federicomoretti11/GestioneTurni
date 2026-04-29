// lib/richieste/notifiche.ts
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateIT } from '@/lib/utils/date'
import type { TipoRichiesta } from '@/lib/types'

type Riga = {
  destinatario_id: string
  tipo: string
  titolo: string
  messaggio: string
}

async function insert(righe: Riga[]) {
  if (!righe.length) return
  try {
    await createAdminClient().from('notifiche').insert(righe)
  } catch (e) {
    console.error('[notifiche-richieste] insert fallita', e)
  }
}

async function idStaff(): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id')
    .in('ruolo', ['admin', 'manager'])
    .eq('attivo', true)
  return (data ?? []).map(r => r.id)
}

async function idAdmin(): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id')
    .eq('ruolo', 'admin')
    .eq('attivo', true)
  return (data ?? []).map(r => r.id)
}

function labelTipo(tipo: TipoRichiesta): string {
  const map: Record<TipoRichiesta, string> = {
    ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno', sblocco_checkin: 'Sblocco check-in',
  }
  return map[tipo]
}

export async function notificaRichiestaCreata(params: {
  tipo: TipoRichiesta
  dataInizio: string
  dataFine: string | null
  nomeDipendente: string
}) {
  const ids = await idStaff()
  const date = params.dataFine ? `${formatDateIT(params.dataInizio)}–${formatDateIT(params.dataFine)}` : formatDateIT(params.dataInizio)
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_creata',
    titolo: `Nuova richiesta: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · ${date}`,
  })))
}

export async function notificaRichiestaApprovataManager(params: {
  tipo: TipoRichiesta
  dataInizio: string
  nomeDipendente: string
}) {
  const ids = await idAdmin()
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_approvata_manager',
    titolo: `Da convalidare: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · approvata dal manager`,
  })))
}

export async function notificaRichiestaApprovata(params: {
  dipendenteId: string
  tipo: TipoRichiesta
  dataInizio: string
  dataFine: string | null
}) {
  const date = params.dataFine ? `${formatDateIT(params.dataInizio)}–${formatDateIT(params.dataFine)}` : formatDateIT(params.dataInizio)
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'richiesta_approvata',
    titolo: `${labelTipo(params.tipo)} approvata`,
    messaggio: `La tua richiesta (${date}) è stata approvata`,
  }])
}

export async function notificaRichiestaRifiutata(params: {
  dipendenteId: string
  tipo: TipoRichiesta
  motivazione: string
}) {
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'richiesta_rifiutata',
    titolo: `${labelTipo(params.tipo)} rifiutata`,
    messaggio: params.motivazione,
  }])
}

export async function notificaMalattiaComunicata(params: {
  tipo: 'malattia'
  dataInizio: string
  nomeDipendente: string
}) {
  const ids = await idStaff()
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'malattia_comunicata',
    titolo: 'Malattia comunicata',
    messaggio: `${params.nomeDipendente} · da ${formatDateIT(params.dataInizio)}`,
  })))
}

export async function notificaSbloccoApprovato(params: {
  dipendenteId: string
}) {
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'sblocco_approvato',
    titolo: 'Sblocco check-in approvato',
    messaggio: 'Puoi effettuare il check-in nei prossimi 30 minuti anche senza GPS.',
  }])
}

export async function notificaRichiestaCancellata(params: {
  tipo: TipoRichiesta
  dataInizio: string
  nomeDipendente: string
}) {
  const ids = await idStaff()
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_cancellata',
    titolo: `Richiesta annullata: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · ${formatDateIT(params.dataInizio)}`,
  })))
}
