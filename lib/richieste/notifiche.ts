// lib/richieste/notifiche.ts
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { broadcastNotifiche } from '@/lib/notifiche'
import { formatDateIT } from '@/lib/utils/date'
import type { TipoRichiesta } from '@/lib/types'

type Riga = {
  destinatario_id: string
  tipo: string
  titolo: string
  messaggio: string
  tenant_id: string
}

async function insert(righe: Riga[]) {
  if (!righe.length) return
  try {
    await createAdminClient().from('notifiche').insert(righe)
    await broadcastNotifiche(righe.map(r => r.destinatario_id))
  } catch (e) {
    console.error('[notifiche-richieste] insert fallita', e)
  }
}

async function idStaff(tenantId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id')
    .in('ruolo', ['admin', 'manager'])
    .eq('attivo', true)
    .eq('tenant_id', tenantId)
  return (data ?? []).map(r => r.id)
}

async function idAdmin(tenantId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id')
    .eq('ruolo', 'admin')
    .eq('attivo', true)
    .eq('tenant_id', tenantId)
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
  tenantId: string
}) {
  const ids = await idStaff(params.tenantId)
  const date = params.dataFine ? `${formatDateIT(params.dataInizio)}–${formatDateIT(params.dataFine)}` : formatDateIT(params.dataInizio)
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_creata',
    titolo: `Nuova richiesta: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · ${date}`,
    tenant_id: params.tenantId,
  })))
}

export async function notificaRichiestaApprovataManager(params: {
  tipo: TipoRichiesta
  dataInizio: string
  nomeDipendente: string
  tenantId: string
}) {
  const ids = await idAdmin(params.tenantId)
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_approvata_manager',
    titolo: `Da convalidare: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · approvata dal manager`,
    tenant_id: params.tenantId,
  })))
}

export async function notificaRichiestaApprovata(params: {
  dipendenteId: string
  tipo: TipoRichiesta
  dataInizio: string
  dataFine: string | null
  tenantId: string
}) {
  const date = params.dataFine ? `${formatDateIT(params.dataInizio)}–${formatDateIT(params.dataFine)}` : formatDateIT(params.dataInizio)
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'richiesta_approvata',
    titolo: `${labelTipo(params.tipo)} approvata`,
    messaggio: `La tua richiesta (${date}) è stata approvata`,
    tenant_id: params.tenantId,
  }])
}

export async function notificaRichiestaRifiutata(params: {
  dipendenteId: string
  tipo: TipoRichiesta
  motivazione: string
  tenantId: string
}) {
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'richiesta_rifiutata',
    titolo: `${labelTipo(params.tipo)} rifiutata`,
    messaggio: params.motivazione,
    tenant_id: params.tenantId,
  }])
}

export async function notificaMalattiaComunicata(params: {
  tipo: 'malattia'
  dataInizio: string
  nomeDipendente: string
  tenantId: string
}) {
  const ids = await idStaff(params.tenantId)
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'malattia_comunicata',
    titolo: 'Malattia comunicata',
    messaggio: `${params.nomeDipendente} · da ${formatDateIT(params.dataInizio)}`,
    tenant_id: params.tenantId,
  })))
}

export async function notificaSbloccoApprovato(params: {
  dipendenteId: string
  tenantId: string
}) {
  await insert([{
    destinatario_id: params.dipendenteId,
    tipo: 'sblocco_approvato',
    titolo: 'Sblocco check-in approvato',
    messaggio: 'Puoi effettuare il check-in nei prossimi 30 minuti anche senza GPS.',
    tenant_id: params.tenantId,
  }])
}

export async function notificaRichiestaCancellata(params: {
  tipo: TipoRichiesta
  dataInizio: string
  nomeDipendente: string
  tenantId: string
}) {
  const ids = await idStaff(params.tenantId)
  await insert(ids.map(id => ({
    destinatario_id: id,
    tipo: 'richiesta_cancellata',
    titolo: `Richiesta annullata: ${labelTipo(params.tipo)}`,
    messaggio: `${params.nomeDipendente} · ${formatDateIT(params.dataInizio)}`,
    tenant_id: params.tenantId,
  })))
}
