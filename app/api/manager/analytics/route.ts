import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkManager() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo, reparto_id').eq('id', user.id).single()
  if (data?.ruolo !== 'manager') return null
  return { user, reparto_id: data.reparto_id as string | null }
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
  const ctx = await checkManager()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let tenantId: string
  try {
    const { requireTenantId } = await import('@/lib/tenant')
    tenantId = requireTenantId()
  } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const url = new URL(request.url)
  const { anno, mese, label } = parseMese(url.searchParams.get('mese'))

  const db = createAdminClient()

  // Dipendenti nel reparto del manager
  const dipQuery = db
    .from('profiles')
    .select('id, nome, cognome')
    .eq('tenant_id', tenantId)
    .eq('attivo', true)
    .eq('ruolo', 'dipendente')
  if (ctx.reparto_id) dipQuery.eq('reparto_id', ctx.reparto_id)

  const { data: dipRaw } = await dipQuery
  const dipendenti = dipRaw ?? []
  const dipIds = dipendenti.map(d => d.id)
  const profiles: Record<string, { nome: string; cognome: string }> = {}
  dipendenti.forEach(d => { profiles[d.id] = { nome: d.nome, cognome: d.cognome } })

  if (dipIds.length === 0) {
    return NextResponse.json({
      periodo: { anno, mese, label },
      ore_per_dipendente: [],
      richieste_per_tipo: [],
      sommario: { totale_turni: 0, totale_ore_pianificate: 0, geo_anomalie_count: 0, richieste_pending: 0 },
    })
  }

  // Ore per dipendente (mese selezionato)
  const { data: oreRaw } = await db
    .from('analytics_ore_mensili')
    .select('dipendente_id, ore_totali, turni_count')
    .eq('tenant_id', tenantId)
    .eq('anno', anno)
    .eq('mese', mese)
    .in('dipendente_id', dipIds)

  const ore_per_dipendente = (oreRaw ?? [])
    .map(r => ({
      dipendente_id: r.dipendente_id,
      nome: profiles[r.dipendente_id]?.nome ?? '',
      cognome: profiles[r.dipendente_id]?.cognome ?? '',
      ore_totali: Number(r.ore_totali),
      turni_count: r.turni_count,
    }))
    .sort((a, b) => b.ore_totali - a.ore_totali)

  // Richieste ultimi 6 mesi (filtrate per dipendenti del reparto)
  const sei = new Date()
  sei.setMonth(sei.getMonth() - 5)
  sei.setDate(1)
  sei.setHours(0, 0, 0, 0)

  const { data: richRaw } = await db
    .from('richieste')
    .select('tipo, stato, created_at')
    .eq('tenant_id', tenantId)
    .in('dipendente_id', dipIds)
    .gte('created_at', sei.toISOString())

  const richMap: Record<string, { tipo: string; stato: string; anno: number; mese: number; count: number }> = {}
  ;(richRaw ?? []).forEach(r => {
    const d = new Date(r.created_at)
    const a = d.getFullYear()
    const m = d.getMonth() + 1
    const k = `${r.tipo}|${r.stato}|${a}|${m}`
    if (!richMap[k]) richMap[k] = { tipo: r.tipo, stato: r.stato, anno: a, mese: m, count: 0 }
    richMap[k].count++
  })
  const richieste_per_tipo = Object.values(richMap).sort((a, b) =>
    a.anno !== b.anno ? a.anno - b.anno : a.mese - b.mese
  )

  // Geo anomalie ultimi 30gg
  const { data: dip30 } = await db
    .from('analytics_dipendenti_30gg')
    .select('dipendente_id, geo_anomalie')
    .eq('tenant_id', tenantId)
    .in('dipendente_id', dipIds)

  const geo_anomalie_count = (dip30 ?? []).reduce((s, r) => s + (r.geo_anomalie ?? 0), 0)

  // Richieste pending
  const { count: richieste_pending } = await db
    .from('richieste')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('dipendente_id', dipIds)
    .in('stato', ['in_attesa', 'in_approvazione'])

  return NextResponse.json({
    periodo: { anno, mese, label },
    ore_per_dipendente,
    richieste_per_tipo,
    sommario: {
      totale_turni: (oreRaw ?? []).reduce((s, r) => s + r.turni_count, 0),
      totale_ore_pianificate: Number(ore_per_dipendente.reduce((s, r) => s + r.ore_totali, 0).toFixed(1)),
      geo_anomalie_count,
      richieste_pending: richieste_pending ?? 0,
    },
  })
}
