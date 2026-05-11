import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateIT, formatTimeShort } from '@/lib/utils/date'

type Riga = {
  destinatario_id: string
  tipo: 'turno_assegnato' | 'turno_modificato' | 'turno_eliminato' | 'settimana_pianificata' | 'check_in' | 'check_out' | 'turni_pubblicati'
  titolo: string
  messaggio: string
  turno_id?: string | null
  data_turno?: string | null
  tenant_id: string
}

async function destinatariStaff(tenantId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .in('ruolo', ['admin', 'manager'])
    .eq('attivo', true)
    .eq('tenant_id', tenantId)
  return (data ?? []).map(r => r.id)
}

function formatOraISO(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export async function broadcastNotifiche(destinatarioIds: string[]) {
  const unique = [...new Set(destinatarioIds)]
  if (!unique.length) return
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        messages: unique.map(id => ({
          topic: `notifiche_${id}`,
          event: 'nuova',
          payload: {},
        })),
      }),
    })
  } catch (e) {
    console.error('[broadcast] fallita', e)
  }
}

async function insertNotifiche(righe: Riga[]) {
  if (!righe.length) return
  try {
    const admin = createAdminClient()
    await admin.from('notifiche').insert(righe)
    await broadcastNotifiche(righe.map(r => r.destinatario_id))
  } catch (e) {
    console.error('[notifiche] insert fallita', e)
  }
}

export async function notificaTurnoAssegnato(params: {
  turnoId: string
  dipendenteId: string
  data: string
  oraInizio: string
  oraFine: string
  actorId: string
  tenantId: string
}) {
  if (params.actorId === params.dipendenteId) return
  await insertNotifiche([{
    destinatario_id: params.dipendenteId,
    tipo: 'turno_assegnato',
    titolo: 'Nuovo turno assegnato',
    messaggio: `${formatDateIT(params.data)} · ${formatTimeShort(params.oraInizio)}–${formatTimeShort(params.oraFine)}`,
    turno_id: params.turnoId,
    data_turno: params.data,
    tenant_id: params.tenantId,
  }])
}

export async function notificaTurnoModificato(params: {
  turnoId: string
  dipendenteId: string
  data: string
  oraInizio: string
  oraFine: string
  actorId: string
  tenantId: string
}) {
  if (params.actorId === params.dipendenteId) return
  await insertNotifiche([{
    destinatario_id: params.dipendenteId,
    tipo: 'turno_modificato',
    titolo: 'Turno modificato',
    messaggio: `${formatDateIT(params.data)} · ${formatTimeShort(params.oraInizio)}–${formatTimeShort(params.oraFine)}`,
    turno_id: params.turnoId,
    data_turno: params.data,
    tenant_id: params.tenantId,
  }])
}

export async function notificaTurnoEliminato(params: {
  dipendenteId: string
  data: string
  actorId: string
  tenantId: string
}) {
  if (params.actorId === params.dipendenteId) return
  await insertNotifiche([{
    destinatario_id: params.dipendenteId,
    tipo: 'turno_eliminato',
    titolo: 'Turno eliminato',
    messaggio: `Il turno del ${formatDateIT(params.data)} è stato eliminato`,
    turno_id: null,
    data_turno: params.data,
    tenant_id: params.tenantId,
  }])
}

export async function notificaSettimanaPianificata(params: {
  dipendenteIds: string[]
  dataInizio: string
  actorId: string
  conteggioPerDipendente: Record<string, number>
  tenantId: string
}) {
  const righe: Riga[] = params.dipendenteIds
    .filter(id => id !== params.actorId)
    .map(id => ({
      destinatario_id: id,
      tipo: 'settimana_pianificata' as const,
      titolo: 'Settimana pianificata',
      messaggio: `${params.conteggioPerDipendente[id] ?? 0} turni dalla settimana del ${formatDateIT(params.dataInizio)}`,
      turno_id: null,
      data_turno: params.dataInizio,
      tenant_id: params.tenantId,
    }))
  await insertNotifiche(righe)
}

export async function notificaCheckIn(params: {
  turnoId: string
  dataTurno: string
  oraIngressoISO: string
  nomeDipendente: string
  tenantId: string
}) {
  const ids = await destinatariStaff(params.tenantId)
  await insertNotifiche(ids.map(id => ({
    destinatario_id: id,
    tipo: 'check_in' as const,
    titolo: 'Check-in turno',
    messaggio: `${params.nomeDipendente} ha iniziato il turno (${formatOraISO(params.oraIngressoISO)})`,
    turno_id: params.turnoId,
    data_turno: params.dataTurno,
    tenant_id: params.tenantId,
  })))
}

export async function notificaCheckOut(params: {
  turnoId: string
  dataTurno: string
  oraUscitaISO: string
  nomeDipendente: string
  tenantId: string
}) {
  const ids = await destinatariStaff(params.tenantId)
  await insertNotifiche(ids.map(id => ({
    destinatario_id: id,
    tipo: 'check_out' as const,
    titolo: 'Check-out turno',
    messaggio: `${params.nomeDipendente} ha terminato il turno (${formatOraISO(params.oraUscitaISO)})`,
    turno_id: params.turnoId,
    data_turno: params.dataTurno,
    tenant_id: params.tenantId,
  })))
}

export async function notificaTurniPubblicati(params: {
  dipendenteIds: string[]
  dataInizio: string
  dataFine: string
  actorId: string
  conteggioPerDipendente: Record<string, number>
  tenantId: string
}) {
  const righe: Riga[] = params.dipendenteIds
    .filter(id => id !== params.actorId)
    .map(id => ({
      destinatario_id: id,
      tipo: 'turni_pubblicati' as const,
      titolo: 'Turni pubblicati',
      messaggio: `${params.conteggioPerDipendente[id] ?? 0} turni dal ${formatDateIT(params.dataInizio)} al ${formatDateIT(params.dataFine)}`,
      turno_id: null,
      data_turno: params.dataInizio,
      tenant_id: params.tenantId,
    }))
  await insertNotifiche(righe)
}

export function turnoCambiatoRilevante(prev: {
  template_id: string | null
  data: string
  ora_inizio: string
  ora_fine: string
  posto_id: string | null
}, next: {
  template_id: string | null
  data: string
  ora_inizio: string
  ora_fine: string
  posto_id: string | null
}): boolean {
  return prev.template_id !== next.template_id
      || prev.data !== next.data
      || prev.ora_inizio !== next.ora_inizio
      || prev.ora_fine !== next.ora_fine
      || prev.posto_id !== next.posto_id
}
