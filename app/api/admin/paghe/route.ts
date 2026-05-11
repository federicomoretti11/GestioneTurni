import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { calcolaOreTurno, calcolaOreDiurneNotturne } from '@/lib/utils/turni'
import { trovaFestivo } from '@/lib/utils/maggiorazioni'
import { NextResponse } from 'next/server'

async function getAuthUser(ruoliConsentiti: string[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (!data || !ruoliConsentiti.includes(data.ruolo)) return null
  return { user, ruolo: data.ruolo }
}

function ultimoGiornoMese(mese: string): string {
  const [anno, meseNum] = mese.split('-').map(Number)
  const ultimo = new Date(anno, meseNum, 0)
  return `${anno}-${String(meseNum).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`
}

export async function GET(request: Request) {
  const auth = await getAuthUser(['admin', 'manager'])
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const mese = searchParams.get('mese')
  if (!mese || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mese)) {
    return NextResponse.json({ error: 'Parametro mese mancante o non valido (YYYY-MM)' }, { status: 400 })
  }

  const data_inizio = `${mese}-01`
  const data_fine = ultimoGiornoMese(mese)

  const supabase = createClient()

  const [{ data: turni, error: errTurni }, { data: festivi, error: errFestivi }, { data: richieste, error: errRichieste }, { data: consuntivo, error: errConsuntivo }] = await Promise.all([
    supabase
      .from('turni')
      .select('id, dipendente_id, data, ora_inizio, ora_fine, ora_ingresso_effettiva, ora_uscita_effettiva, profile:profiles!turni_dipendente_id_fkey(id, nome, cognome)')
      .eq('stato', 'confermato')
      .eq('tenant_id', tenantId)
      .gte('data', data_inizio)
      .lte('data', data_fine),
    supabase
      .from('festivi')
      .select('data, nome, tipo, created_at')
      .eq('tenant_id', tenantId)
      .gte('data', data_inizio)
      .lte('data', data_fine),
    supabase
      .from('richieste')
      .select('dipendente_id, tipo, data_inizio, data_fine')
      .eq('tenant_id', tenantId)
      .eq('stato', 'approvata')
      .in('tipo', ['ferie', 'permesso', 'malattia'])
      .gte('data_inizio', data_inizio)
      .lte('data_inizio', data_fine),
    supabase
      .from('consuntivi_paghe')
      .select('id, stato, approvato_at, approvato_da, profiles!consuntivi_paghe_approvato_da_fkey(nome, cognome)')
      .eq('tenant_id', tenantId)
      .eq('mese', data_inizio)
      .maybeSingle(),
  ])

  if (errTurni) return NextResponse.json({ error: errTurni.message }, { status: 500 })
  if (errFestivi) return NextResponse.json({ error: errFestivi.message }, { status: 500 })
  if (errRichieste) return NextResponse.json({ error: errRichieste.message }, { status: 500 })
  if (errConsuntivo) return NextResponse.json({ error: errConsuntivo.message }, { status: 500 })

  const festiviList = (festivi ?? []) as { data: string; nome: string; tipo: 'nazionale' | 'patronale' | 'custom'; created_at: string }[]

  type RigaMap = {
    dipendente_id: string
    cognome: string
    nome_completo: string
    ore_ordinarie: number
    ore_notturne: number
    ore_festive: number
    ore_straordinarie: number
    giorni_ferie: number
    giorni_permesso: number
    giorni_malattia: number
    turni_count: number
  }

  const righeMap = new Map<string, RigaMap>()

  for (const turno of turni ?? []) {
    const profile = turno.profile as { id: string; nome: string; cognome: string } | null
    if (!profile) continue

    if (!righeMap.has(turno.dipendente_id)) {
      righeMap.set(turno.dipendente_id, {
        dipendente_id: turno.dipendente_id,
        cognome: profile.cognome,
        nome_completo: `${profile.cognome} ${profile.nome}`,
        ore_ordinarie: 0,
        ore_notturne: 0,
        ore_festive: 0,
        ore_straordinarie: 0,
        giorni_ferie: 0,
        giorni_permesso: 0,
        giorni_malattia: 0,
        turni_count: 0,
      })
    }

    const riga = righeMap.get(turno.dipendente_id)!
    riga.turni_count++

    const oraInizio = (turno.ora_inizio as string).slice(0, 5)
    const oraFine = (turno.ora_fine as string).slice(0, 5)
    const festivo = trovaFestivo(turno.data, festiviList)

    if (festivo) {
      riga.ore_festive += calcolaOreTurno(oraInizio, oraFine)
    } else {
      const { diurne, notturne } = calcolaOreDiurneNotturne(oraInizio, oraFine)
      riga.ore_ordinarie += diurne
      riga.ore_notturne += notturne
    }

    // Ore notturne anche nei festivi
    if (festivo) {
      const { notturne } = calcolaOreDiurneNotturne(oraInizio, oraFine)
      riga.ore_notturne += notturne
    }

    // Straordinari: solo se timbratura completa
    if (turno.ora_ingresso_effettiva && turno.ora_uscita_effettiva) {
      const oreEffettive = calcolaOreTurno(
        (turno.ora_ingresso_effettiva as string).slice(11, 16),
        (turno.ora_uscita_effettiva as string).slice(11, 16)
      )
      const orePianificate = calcolaOreTurno(oraInizio, oraFine)
      const diff = oreEffettive - orePianificate
      if (diff > 0) riga.ore_straordinarie += diff
    }
  }

  // Conteggio richieste per dipendente
  for (const r of richieste ?? []) {
    const riga = righeMap.get(r.dipendente_id)
    if (!riga) continue
    if (r.tipo === 'ferie') riga.giorni_ferie++
    else if (r.tipo === 'permesso') riga.giorni_permesso++
    else if (r.tipo === 'malattia') riga.giorni_malattia++
  }

  const righe = Array.from(righeMap.values())
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'it'))
    .map(({ cognome: _c, nome_completo, ...rest }) => ({
      ...rest,
      nome: nome_completo,
    }))

  let consuntivo_esistente = null
  if (consuntivo) {
    const approvatore = consuntivo.profiles as { nome: string; cognome: string } | null
    consuntivo_esistente = {
      id: consuntivo.id,
      stato: consuntivo.stato,
      approvato_at: consuntivo.approvato_at,
      approvato_da_nome: approvatore ? `${approvatore.nome} ${approvatore.cognome}` : null,
    }
  }

  return NextResponse.json({ mese: data_inizio, consuntivo_esistente, righe })
}

export async function POST(request: Request) {
  const auth = await getAuthUser(['admin'])
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const body = await request.json()
  const { mese, righe } = body as {
    mese: string
    righe: {
      dipendente_id: string
      ore_ordinarie: number
      ore_notturne: number
      ore_festive: number
      ore_straordinarie: number
      giorni_ferie: number
      giorni_permesso: number
      giorni_malattia: number
      turni_count: number
    }[]
  }

  if (!mese || !righe) {
    return NextResponse.json({ error: 'mese e righe obbligatori' }, { status: 400 })
  }

  const data_inizio = `${mese}-01`
  const admin = createAdminClient()

  const { data: consuntivo, error: errUpsert } = await admin
    .from('consuntivi_paghe')
    .upsert({
      tenant_id: tenantId,
      mese: data_inizio,
      stato: 'approvato',
      approvato_da: auth.user.id,
      approvato_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,mese' })
    .select()
    .single()

  if (errUpsert) return NextResponse.json({ error: errUpsert.message }, { status: 500 })

  const { error: errDelete } = await admin
    .from('consuntivi_righe')
    .delete()
    .eq('consuntivo_id', consuntivo.id)

  if (errDelete) return NextResponse.json({ error: errDelete.message }, { status: 500 })

  const nuoveRighe = righe.map(r => ({ ...r, consuntivo_id: consuntivo.id, tenant_id: tenantId }))
  const { error: errInsert } = await admin.from('consuntivi_righe').insert(nuoveRighe)

  if (errInsert) return NextResponse.json({ error: errInsert.message }, { status: 500 })

  return NextResponse.json({ ok: true, consuntivo_id: consuntivo.id })
}
