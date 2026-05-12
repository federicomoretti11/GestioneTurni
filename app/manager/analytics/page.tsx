import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAnalyticsAbilitato } from '@/lib/impostazioni'
import { MeseSelector } from '@/components/analytics/MeseSelector'
import { headers } from 'next/headers'

interface OreDip {
  dipendente_id: string; nome: string; cognome: string
  ore_totali: number; turni_count: number
}
interface RichMensile { tipo: string; stato: string; anno: number; mese: number; count: number }
interface Sommario {
  totale_turni: number; totale_ore_pianificate: number
  geo_anomalie_count: number; richieste_pending: number
}
interface AnalyticsData {
  periodo: { anno: number; mese: number; label: string }
  sommario: Sommario
  ore_per_dipendente: OreDip[]
  richieste_per_tipo: RichMensile[]
}

const A = {
  blue:  { tint: '#EEF3FF', icon: '#3B5BDB', text: '#2A3FAE' },
  amber: { tint: '#FBF3E5', icon: '#A87420', text: '#7C5414' },
  red:   { tint: '#FFF0F0', icon: '#C92A2A', text: '#9B2020' },
  teal:  { tint: '#E6F8F5', icon: '#0D9488', text: '#0A7A71' },
} as const

function MetricCard({ label, valore, sub, accent }: {
  label: string; valore: string | number; sub?: string
  accent: keyof typeof A
}) {
  const a = A[accent]
  return (
    <div className="rounded-xl bg-white border border-slate-900/20 p-4 sm:p-5" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: a.icon }} />
        <span className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: a.text }}>{label}</span>
      </div>
      <div className="text-[26px] font-semibold tracking-tight text-slate-900 leading-none">{valore}</div>
      {sub && <div className="text-[12px] text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function tipoLabel(tipo: string) {
  const map: Record<string, string> = {
    ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno',
  }
  return map[tipo] ?? tipo
}

function statoColor(stato: string) {
  if (stato === 'approvata') return '#2F8A55'
  if (stato === 'rifiutata') return '#C92A2A'
  return '#A87420'
}

export default async function ManagerAnalyticsPage({ searchParams }: { searchParams: { mese?: string } }) {
  const abilitato = await isAnalyticsAbilitato()
  if (!abilitato) redirect('/home')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hdrs = headers()
  const host = hdrs.get('host') ?? 'localhost'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const mese = searchParams.mese
  const url = `${proto}://${host}/api/manager/analytics${mese ? `?mese=${mese}` : ''}`

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      cookie: hdrs.get('cookie') ?? '',
      'x-tenant-id': hdrs.get('x-tenant-id') ?? '',
    },
  })

  if (!res.ok) {
    return (
      <div className="rounded-xl bg-white border border-slate-900/20 p-8 text-center">
        <p className="text-sm text-slate-400">Impossibile caricare i dati analytics.</p>
      </div>
    )
  }

  const d: AnalyticsData = await res.json()
  const { sommario, ore_per_dipendente, richieste_per_tipo, periodo } = d

  const meseValue = `${periodo.anno}-${String(periodo.mese).padStart(2, '0')}`
  const maxOre = Math.max(...ore_per_dipendente.map(r => r.ore_totali), 1)

  const tipiUnici = [...new Set(richieste_per_tipo.map(r => r.tipo))]
  const statiUnici = [...new Set(richieste_per_tipo.map(r => r.stato))]
  const totPerTipo = tipiUnici.map(tipo => {
    const righe = richieste_per_tipo.filter(r => r.tipo === tipo)
    const totale = righe.reduce((s, r) => s + r.count, 0)
    const perStato = statiUnici.reduce((acc, stato) => {
      acc[stato] = righe.filter(r => r.stato === stato).reduce((s, r) => s + r.count, 0)
      return acc
    }, {} as Record<string, number>)
    return { tipo, totale, perStato }
  }).sort((a, b) => b.totale - a.totale)

  return (
    <div className="space-y-6 max-w-5xl">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Workforce Analytics</h1>
        <MeseSelector meseCorrente={meseValue} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="Turni" valore={sommario.totale_turni} sub={periodo.label} accent="blue" />
        <MetricCard label="Ore pianificate" valore={`${sommario.totale_ore_pianificate}h`} sub="somma reparto" accent="teal" />
        <MetricCard label="Anomalie GPS" valore={sommario.geo_anomalie_count} sub="ultimi 30 giorni" accent={sommario.geo_anomalie_count > 0 ? 'red' : 'teal'} />
        <MetricCard label="Richieste pending" valore={sommario.richieste_pending} sub="da approvare" accent={sommario.richieste_pending > 0 ? 'amber' : 'teal'} />
      </div>

      <div className="rounded-xl bg-white border border-slate-900/20 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Ore per dipendente</h2>
          <span className="text-xs text-slate-400 capitalize">{periodo.label}</span>
        </div>

        {ore_per_dipendente.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">Nessun turno registrato nel periodo selezionato.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-[1fr_56px_80px_80px] gap-3 px-5 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              <span>Dipendente</span>
              <span className="text-right">Turni</span>
              <span className="text-right">Ore</span>
              <span className="text-right">Progresso</span>
            </div>
            {ore_per_dipendente.map(r => {
              const pct = maxOre > 0 ? Math.round((r.ore_totali / maxOre) * 100) : 0
              return (
                <div key={r.dipendente_id} className="grid grid-cols-[1fr_56px_80px_80px] gap-3 items-center px-5 py-2.5">
                  <span className="text-sm text-slate-800 font-medium truncate">{r.cognome} {r.nome}</span>
                  <span className="text-sm text-slate-500 text-right tabular-nums">{r.turni_count}</span>
                  <span className="text-sm text-slate-800 font-medium text-right tabular-nums">{r.ore_totali.toFixed(1)}h</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white border border-slate-900/20 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Richieste — ultimi 6 mesi</h2>
        </div>

        {totPerTipo.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">Nessuna richiesta negli ultimi 6 mesi.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {totPerTipo.map(({ tipo, totale, perStato }) => (
              <div key={tipo} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="sm:w-40 shrink-0">
                  <span className="text-sm font-semibold text-slate-800">{tipoLabel(tipo)}</span>
                  <span className="text-xs text-slate-400 ml-2">{totale} totali</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(perStato)
                    .filter(([, n]) => n > 0)
                    .map(([stato, n]) => (
                      <span key={stato} className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600" style={{ color: statoColor(stato) }}>
                        {stato}: {n}
                      </span>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
