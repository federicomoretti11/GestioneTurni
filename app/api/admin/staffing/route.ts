import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAccesso() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return user
}

function lunediSettimana(dateStr?: string | null): Date {
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const user = await checkAccesso()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { searchParams } = new URL(req.url)
  const lun = lunediSettimana(searchParams.get('settimana'))

  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lun)
    d.setDate(lun.getDate() + i)
    return toDateStr(d)
  })

  const admin = createAdminClient()

  const [{ data: posti }, { data: fabbisogni }, { data: turni }] = await Promise.all([
    admin.from('posti_di_servizio').select('id, nome').eq('tenant_id', tenantId).eq('attivo', true).order('nome'),
    admin.from('staffing_fabbisogno').select('posto_id, giorno_settimana, min_persone').eq('tenant_id', tenantId),
    admin.from('turni').select('posto_id, data').eq('tenant_id', tenantId).eq('stato', 'confermato')
      .gte('data', giorni[0]).lte('data', giorni[6]).not('posto_id', 'is', null),
  ])

  const fabMap = new Map<string, number>()
  for (const f of fabbisogni ?? []) {
    fabMap.set(`${f.posto_id}-${f.giorno_settimana}`, f.min_persone as number)
  }

  const turniMap = new Map<string, number>()
  for (const t of turni ?? []) {
    const key = `${t.posto_id}-${t.data}`
    turniMap.set(key, (turniMap.get(key) ?? 0) + 1)
  }

  const result = (posti ?? []).map(posto => ({
    posto_id: posto.id,
    posto_nome: posto.nome,
    giorni: giorni.map((data, i) => {
      const confermati = turniMap.get(`${posto.id}-${data}`) ?? 0
      const minimo = fabMap.get(`${posto.id}-${i}`) ?? 0
      return { data, giorno: i, confermati, minimo, ok: confermati >= minimo }
    }),
  }))

  return NextResponse.json({ settimana: giorni[0], posti: result })
}
