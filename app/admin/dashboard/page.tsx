import { createClient } from '@/lib/supabase/server'
import { calcolaOreTurno } from '@/lib/utils/turni'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'

function oreLabel(ore: number) {
  if (ore === 0) return '—'
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

function getWeekRange(oggi: string) {
  const d = new Date(oggi)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1 // lun=0
  const lun = new Date(d); lun.setDate(d.getDate() - day)
  const dom = new Date(lun); dom.setDate(lun.getDate() + 6)
  return {
    inizio: lun.toISOString().slice(0, 10),
    fine: dom.toISOString().slice(0, 10),
  }
}

function formatDataLunga(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function salutoOrario() {
  const h = new Date().getHours()
  if (h < 13) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

export default async function AdminDashboard() {
  const supabase = createClient()
  const oggi = new Date().toISOString().slice(0, 10)
  const { inizio, fine } = getWeekRange(oggi)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: meProfile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  const [
    { data: turniOggi },
    { data: turniSettimana },
    { data: tuttiPosti },
    { count: numDipendenti },
  ] = await Promise.all([
    supabase
      .from('turni')
      .select('*, profile:profiles!turni_dipendente_id_fkey(nome, cognome), template:turni_template(colore, nome), posto:posti_di_servizio(nome)')
      .eq('stato', 'confermato')
      .eq('data', oggi)
      .order('ora_inizio'),
    supabase
      .from('turni')
      .select('dipendente_id, ora_inizio, ora_fine, profile:profiles!turni_dipendente_id_fkey(nome, cognome)')
      .eq('stato', 'confermato')
      .gte('data', inizio)
      .lte('data', fine),
    supabase.from('posti_di_servizio').select('id, nome').eq('attivo', true).order('nome'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('attivo', true).eq('ruolo', 'dipendente'),
  ])

  const orePerDip = new Map<string, { nome: string; ore: number }>()
  for (const t of turniSettimana ?? []) {
    const key = t.dipendente_id
    const profile = t.profile as unknown as { nome: string; cognome: string }
    const nome = `${profile.cognome} ${profile.nome}`
    const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
    if (!orePerDip.has(key)) orePerDip.set(key, { nome, ore: 0 })
    orePerDip.get(key)!.ore += ore
  }
  const riepilogoSettimana = Array.from(orePerDip.values()).sort((a, b) => a.nome.localeCompare(b.nome))

  const postiCopertiOggi = new Set((turniOggi ?? []).map((t: { posto?: { nome: string } | null }) => t.posto?.nome).filter(Boolean))
  const postiScoperti = (tuttiPosti ?? []).filter(p => !postiCopertiOggi.has(p.nome))

  const kpis: { value: number; label: string; color: string }[] = [
    { value: numDipendenti ?? 0, label: 'Dipendenti attivi', color: 'text-blue-600' },
    { value: turniOggi?.length ?? 0, label: 'Turni oggi', color: 'text-emerald-600' },
    { value: postiScoperti.length, label: 'Posti scoperti oggi', color: postiScoperti.length > 0 ? 'text-red-500' : 'text-emerald-600' },
  ]

  return (
    <div className="-m-4 md:-m-4 md:mb-0">
      {/* Hero gradient */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-500 px-4 md:px-6 pt-4 md:pt-6 pb-8 md:pb-10">
        <div className="text-[11px] text-white/70 capitalize">{formatDataLunga(oggi)}</div>
        <h1 className="text-lg md:text-2xl font-bold text-white mt-1">
          {salutoOrario()}, {meProfile?.nome ?? 'Admin'} 👋
        </h1>
      </div>

      {/* KPI sovrapposti al gradient */}
      <div className="px-4 md:px-6 -mt-4 md:-mt-5 space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
        {kpis.map(k => (
          <div
            key={k.label}
            className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 md:p-5 flex items-center justify-between md:block"
          >
            <div className="md:order-2">
              <div className="text-[11px] md:text-xs font-medium text-gray-500 md:mt-1">{k.label}</div>
            </div>
            <div className={`text-2xl md:text-3xl font-bold md:order-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Posti scoperti alert */}
      {postiScoperti.length > 0 && (
        <div className="px-4 md:px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Posti senza copertura oggi</p>
                <p className="text-sm text-red-700 mt-0.5">{postiScoperti.map(p => p.nome).join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sezioni */}
      <div className="px-4 md:px-6 mt-6 mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Turni di oggi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-sm text-gray-800">Turni di oggi</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(turniOggi ?? []).length === 0 && (
              <EmptyState icon="📅" title="Nessun turno oggi" description="Quando verranno pianificati dei turni appariranno qui." size="sm" />
            )}
            {(turniOggi ?? []).map((t: { id: string; ora_inizio: string; ora_fine: string; profile: { nome: string; cognome: string }; template?: { colore?: string; nome?: string } | null; posto?: { nome: string } | null }) => {
              const colore = t.template?.colore ?? '#6b7280'
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar nome={t.profile.nome} cognome={t.profile.cognome} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {t.profile.cognome} {t.profile.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {t.template?.nome && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: `${colore}22`, color: colore }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colore }} />
                          {t.template.nome}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500">
                        {t.ora_inizio.slice(0,5)}–{t.ora_fine.slice(0,5)}
                        {t.posto?.nome && ` · ${t.posto.nome}`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ore settimana */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-800">Ore questa settimana</h2>
            <span className="text-[11px] text-gray-400">{inizio.slice(5).replace('-', '/')} — {fine.slice(5).replace('-', '/')}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {riepilogoSettimana.length === 0 && (
              <EmptyState icon="⏱" title="Nessun turno questa settimana" size="sm" />
            )}
            {riepilogoSettimana.map(d => {
              const [cognome, ...restoNome] = d.nome.split(' ')
              const nome = restoNome.join(' ')
              return (
                <div key={d.nome} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar nome={nome} cognome={cognome} size={28} />
                    <span className="text-sm text-gray-700 truncate">{d.nome}</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700 flex-shrink-0">{oreLabel(d.ore)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
