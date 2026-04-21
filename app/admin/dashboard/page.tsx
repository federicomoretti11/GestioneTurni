import { createClient } from '@/lib/supabase/server'
import { calcolaOreTurno } from '@/lib/utils/turni'

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

export default async function AdminDashboard() {
  const supabase = createClient()
  const oggi = new Date().toISOString().slice(0, 10)
  const { inizio, fine } = getWeekRange(oggi)

  const [
    { data: turniOggi },
    { data: turniSettimana },
    { data: tuttiPosti },
    { count: numDipendenti },
  ] = await Promise.all([
    supabase
      .from('turni')
      .select('*, profile:profiles!turni_dipendente_id_fkey(nome, cognome), template:turni_template(colore, nome), posto:posti_di_servizio(nome)')
      .eq('data', oggi)
      .order('ora_inizio'),
    supabase
      .from('turni')
      .select('dipendente_id, ora_inizio, ora_fine, profile:profiles!turni_dipendente_id_fkey(nome, cognome)')
      .gte('data', inizio)
      .lte('data', fine),
    supabase.from('posti_di_servizio').select('id, nome').eq('attivo', true).order('nome'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('attivo', true).eq('ruolo', 'dipendente'),
  ])

  // Ore settimana per dipendente
  const orePerDip = new Map<string, { nome: string; ore: number }>()
  for (const t of turniSettimana ?? []) {
    const key = t.dipendente_id
    const profile = t.profile as { nome: string; cognome: string }
    const nome = `${profile.cognome} ${profile.nome}`
    const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
    if (!orePerDip.has(key)) orePerDip.set(key, { nome, ore: 0 })
    orePerDip.get(key)!.ore += ore
  }
  const riepilogoSettimana = Array.from(orePerDip.values()).sort((a, b) => a.nome.localeCompare(b.nome))

  // Posti scoperti oggi
  const postiCopertiOggi = new Set((turniOggi ?? []).map((t: { posto?: { nome: string } }) => t.posto?.nome).filter(Boolean))
  const postiScoperti = (tuttiPosti ?? []).filter(p => !postiCopertiOggi.has(p.nome))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl font-bold text-gray-900">{numDipendenti ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Dipendenti attivi</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-3xl font-bold text-gray-900">{turniOggi?.length ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Turni oggi</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className={`text-3xl font-bold ${postiScoperti.length > 0 ? 'text-orange-500' : 'text-green-600'}`}>
            {postiScoperti.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">Posti scoperti oggi</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turni di oggi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Turni di oggi</h2>
            <p className="text-xs text-gray-400">{oggi}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {(turniOggi ?? []).length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nessun turno oggi.</p>
            )}
            {(turniOggi ?? []).map((t: { id: string; ora_inizio: string; ora_fine: string; profile: { nome: string; cognome: string }; template?: { colore?: string }; posto?: { nome: string } }) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.template?.colore ?? '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {t.profile.cognome} {t.profile.nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.posto?.nome ?? 'Nessun posto'} · {t.ora_inizio.slice(0,5)}–{t.ora_fine.slice(0,5)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ore settimana */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Ore questa settimana</h2>
            <p className="text-xs text-gray-400">{inizio} / {fine}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {riepilogoSettimana.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nessun turno questa settimana.</p>
            )}
            {riepilogoSettimana.map(d => (
              <div key={d.nome} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-700">{d.nome}</span>
                <span className="text-sm font-semibold text-blue-700">{oreLabel(d.ore)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posti scoperti */}
      {postiScoperti.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-orange-800 mb-1">Posti senza copertura oggi</p>
          <p className="text-sm text-orange-700">{postiScoperti.map(p => p.nome).join(', ')}</p>
        </div>
      )}
    </div>
  )
}
