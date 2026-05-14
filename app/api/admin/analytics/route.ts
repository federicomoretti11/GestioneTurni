import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { user }
}

function parseMese(param: string | null): { anno: number; mese: number; label: string } {
  const oggi = new Date()
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [a, m] = param.split('-').map(Number)
    const d = new Date(a, m - 1)
    return { anno: a, mese: m, label: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) }
  }
  return {
    anno: oggi.getFullYear(),
    mese: oggi.getMonth() + 1,
    label: oggi.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
  }
}

export async function GET(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let tenantId: string
  try {
    const { requireTenantId } = await import('@/lib/tenant')
    tenantId = requireTenantId()
  } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const url = new URL(request.url)
  const meseParam = url.searchParams.get('mese')
  if (meseParam && !/^\d{4}-\d{2}$/.test(meseParam)) {
    return NextResponse.json({ error: 'Formato mese non valido (YYYY-MM)' }, { status: 400 })
  }
  const { anno, mese, label } = parseMese(meseParam)

  const db = createAdminClient()

  // Ore per dipendente (mese selezionato)
  const { data: oreRaw } = await db
    .from('analytics_ore_mensili')
    .select('dipendente_id, ore_totali, turni_count')
    .eq('tenant_id', tenantId)
    .eq('anno', anno)
    .eq('mese', mese)

  // Nomi dipendenti per join lato server
  const dipIds = (oreRaw ?? []).map(r => r.dipendente_id)
  const profiles: Record<string, { nome: string; cognome: string }> = {}
  if (dipIds.length > 0) {
    const { data: pRaw } = await db
      .from('profiles')
      .select('id, nome, cognome')
      .in('id', dipIds)
    ;(pRaw ?? []).forEach(p => { profiles[p.id] = { nome: p.nome, cognome: p.cognome } })
  }

  const ore_per_dipendente = (oreRaw ?? [])
    .map(r => ({
      dipendente_id: r.dipendente_id,
      nome: profiles[r.dipendente_id]?.nome ?? '',
      cognome: profiles[r.dipendente_id]?.cognome ?? '',
      ore_totali: Number(r.ore_totali),
      turni_count: r.turni_count,
    }))
    .sort((a, b) => b.ore_totali - a.ore_totali)

  // Richieste ultimi 6 mesi
  const sei = new Date()
  sei.setMonth(sei.getMonth() - 5)
  const { data: richRaw } = await db
    .from('analytics_richieste_mensili')
    .select('tipo, stato, anno, mese, count')
    .eq('tenant_id', tenantId)
    .gte('anno', sei.getFullYear())
    .order('anno').order('mese')

  // Statistiche dipendenti 30gg
  const { data: dip30 } = await db
    .from('analytics_dipendenti_30gg')
    .select('dipendente_id, nome, cognome, turni_confermati, turni_con_timbratura, geo_anomalie, ore_pianificate, ore_effettive')
    .eq('tenant_id', tenantId)
    .order('cognome')

  // Sommario
  const totale_turni = (oreRaw ?? []).reduce((s, r) => s + r.turni_count, 0)
  const totale_ore_pianificate = ore_per_dipendente.reduce((s, r) => s + r.ore_totali, 0)
  const geo_anomalie_count = (dip30 ?? []).reduce((s, r) => s + (r.geo_anomalie ?? 0), 0)

  const { count: richieste_pending } = await db
    .from('richieste')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('stato', ['in_attesa', 'in_approvazione'])

  return NextResponse.json({
    periodo: { anno, mese, label },
    ore_per_dipendente,
    richieste_per_tipo: richRaw ?? [],
    dipendenti_stats: (dip30 ?? []).map(r => ({
      ...r,
      ore_pianificate: Number(r.ore_pianificate ?? 0),
      ore_effettive: r.ore_effettive !== null ? Number(r.ore_effettive) : null,
    })),
    sommario: {
      totale_turni,
      totale_ore_pianificate: Number(totale_ore_pianificate.toFixed(1)),
      geo_anomalie_count,
      richieste_pending: richieste_pending ?? 0,
    },
  })
}
