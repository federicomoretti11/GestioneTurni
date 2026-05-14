import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { notificaCheckIn } from '@/lib/notifiche'
import { haversineMetri } from '@/lib/utils/geo'
import { requireTenantId } from '@/lib/tenant'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tenantId = requireTenantId()
  const body = await req.json().catch(() => ({})) as { latitudine?: number; longitudine?: number }

  if (body.latitudine != null && (body.latitudine < -90 || body.latitudine > 90)) {
    return NextResponse.json({ error: 'Coordinate non valide' }, { status: 400 })
  }
  if (body.longitudine != null && (body.longitudine < -180 || body.longitudine > 180)) {
    return NextResponse.json({ error: 'Coordinate non valide' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: turno, error: readErr } = await admin
    .from('turni')
    .select(`id, dipendente_id, data, stato, ora_ingresso_effettiva, posto_id,
      sblocco_checkin_valido_fino,
      profile:profiles!turni_dipendente_id_fkey(nome, cognome),
      posto:posti_di_servizio(id, latitudine, longitudine, raggio_metri, geo_check_abilitato)`)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()
  if (readErr || !turno) return NextResponse.json({ error: 'Turno non trovato' }, { status: 404 })
  if (turno.stato === 'bozza') return NextResponse.json({ error: 'Turno non trovato' }, { status: 404 })
  if (turno.dipendente_id !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  if (turno.ora_ingresso_effettiva) return NextResponse.json({ error: 'Check-in già effettuato' }, { status: 409 })

  // Calcola anomalia geo (soft check, non blocca)
  let geoAnomalia = false
  const posto = turno.posto as unknown as { latitudine: number | null; longitudine: number | null; raggio_metri: number; geo_check_abilitato: boolean } | null
  if (body.latitudine != null && body.longitudine != null && posto?.geo_check_abilitato && posto.latitudine != null && posto.longitudine != null) {
    const dist = haversineMetri(body.latitudine, body.longitudine, posto.latitudine, posto.longitudine)
    if (dist > posto.raggio_metri * 3) geoAnomalia = true
  }

  // Sblocco attivo: consuma il token
  const sbloccato = turno.sblocco_checkin_valido_fino &&
    new Date(turno.sblocco_checkin_valido_fino as string) > new Date()

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {
    ora_ingresso_effettiva: now,
    lat_checkin: body.latitudine ?? null,
    lng_checkin: body.longitudine ?? null,
    geo_anomalia: geoAnomalia,
  }
  if (sbloccato) {
    updatePayload.sblocco_checkin_valido_fino = null
    updatePayload.sblocco_usato_at = now
  }

  const { data: updated, error: updErr } = await admin
    .from('turni')
    .update(updatePayload)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select('*, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome), template:turni_template(*), posto:posti_di_servizio(id, nome, attivo, latitudine, longitudine, raggio_metri, geo_check_abilitato)')
    .single()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  const profile = (turno.profile as unknown as { nome: string; cognome: string } | null)
  await notificaCheckIn({
    turnoId: turno.id,
    dataTurno: turno.data,
    oraIngressoISO: now,
    nomeDipendente: profile ? `${profile.nome} ${profile.cognome}` : 'Dipendente',
    tenantId,
  })

  return NextResponse.json(updated)
}
