'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { exportExcel, exportCsv, exportPdf, calcolaAssenzeDipendenti } from '@/lib/utils/export'
import { calcolaOreTurno } from '@/lib/utils/turni'
import type { Profile, PostoDiServizio, TurnoConDettagli } from '@/lib/types'

interface RigaAssenza { nome: string; ferie: number; permesso: number; malattia: number }

interface Anteprima {
  totaleOre: number
  totaleTurni: number
  perDipendente: { nome: string; ore: number; turni: number }[]
  assenze: RigaAssenza[]
}

function calcolaAnteprima(turni: TurnoConDettagli[]): Anteprima {
  const isAssenza = (t: TurnoConDettagli) => ['ferie', 'permesso', 'malattia'].includes(t.template?.categoria ?? '')
  const turniLavoro = turni.filter(t => !isAssenza(t))

  const map = new Map<string, { nome: string; ore: number; turni: number }>()
  for (const t of turniLavoro) {
    const key = t.dipendente_id
    const nome = `${t.profile.cognome} ${t.profile.nome}`
    const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
    if (!map.has(key)) map.set(key, { nome, ore: 0, turni: 0 })
    const entry = map.get(key)!
    entry.ore += ore
    entry.turni += 1
  }
  const perDipendente = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  return {
    totaleOre: perDipendente.reduce((s, d) => s + d.ore, 0),
    totaleTurni: turniLavoro.length,
    perDipendente,
    assenze: calcolaAssenzeDipendenti(turni),
  }
}

function oreLabel(ore: number) {
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

export default function ExportPage() {
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [filtroDipendente, setFiltroDipendente] = useState('')
  const [filtroPosto, setFiltroPosto] = useState('')
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [posti, setPosti] = useState<PostoDiServizio[]>([])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null)
  const [turniCaricati, setTurniCaricati] = useState<TurnoConDettagli[] | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/utenti').then(r => r.json()),
      fetch('/api/posti').then(r => r.json()),
    ]).then(([utenti, pst]) => {
      setDipendenti((utenti as Profile[]).filter(u => u.ruolo === 'dipendente' && u.attivo))
      setPosti(pst)
    })
  }, [])

  // Reset anteprima se cambiano i filtri
  useEffect(() => { setAnteprima(null); setTurniCaricati(null) }, [dataInizio, dataFine, filtroDipendente, filtroPosto])

  async function fetchEFiltra(): Promise<TurnoConDettagli[] | null> {
    if (!dataInizio || !dataFine) { setErrore('Seleziona un intervallo di date'); return null }
    setErrore('')
    setLoading(true)
    const res = await fetch(`/api/turni?data_inizio=${dataInizio}&data_fine=${dataFine}`)
    if (!res.ok) { setErrore('Errore nel caricamento dei turni. Riprova.'); setLoading(false); return null }
    let turni: TurnoConDettagli[] = await res.json()
    if (filtroDipendente) turni = turni.filter(t => t.dipendente_id === filtroDipendente)
    if (filtroPosto) turni = turni.filter(t => t.posto_id === filtroPosto)
    setLoading(false)
    return turni
  }

  async function handleAnteprima() {
    const turni = await fetchEFiltra()
    if (!turni) return
    setTurniCaricati(turni)
    setAnteprima(calcolaAnteprima(turni))
  }

  async function handleExport(tipo: 'pdf' | 'excel' | 'csv') {
    const turni = turniCaricati ?? await fetchEFiltra()
    if (!turni) return

    const dipNome = dipendenti.find(d => d.id === filtroDipendente)
    const postoNome = posti.find(p => p.id === filtroPosto)

    const suffixParts = [
      dipNome ? `${dipNome.cognome}_${dipNome.nome}` : '',
      postoNome ? postoNome.nome.replace(/\s+/g, '_') : '',
    ].filter(Boolean)

    const filename = ['turni', dataInizio, dataFine, ...suffixParts].join('_')

    const periodoParts = [`${dataInizio} / ${dataFine}`]
    if (dipNome) periodoParts.push(`Dipendente: ${dipNome.cognome} ${dipNome.nome}`)
    if (postoNome) periodoParts.push(`Posto: ${postoNome.nome}`)
    const periodo = periodoParts.join(' — ')

    if (tipo === 'pdf') await exportPdf(turni, filename, periodo)
    if (tipo === 'excel') await exportExcel(turni, filename)
    if (tipo === 'csv') await exportCsv(turni, filename)
  }

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-xl font-bold text-gray-900">Export Turni</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data inizio" type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} />
          <Input label="Data fine" type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dipendente <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <select value={filtroDipendente} onChange={e => setFiltroDipendente(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tutti</option>
            {dipendenti.map(d => <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Posto di servizio <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <select value={filtroPosto} onChange={e => setFiltroPosto(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tutti</option>
            {posti.filter(p => p.attivo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        {errore && <p className="text-sm text-red-600">{errore}</p>}

        <Button variant="secondary" onClick={handleAnteprima} disabled={loading} className="w-full">
          {loading ? 'Caricamento...' : 'Anteprima'}
        </Button>
      </div>

      {anteprima && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Riepilogo</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{oreLabel(anteprima.totaleOre)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ore totali</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{anteprima.totaleTurni}</p>
              <p className="text-xs text-gray-500 mt-0.5">Turni</p>
            </div>
          </div>

          {anteprima.perDipendente.length > 1 && (
            <div className="divide-y divide-gray-100">
              {anteprima.perDipendente.map(d => (
                <div key={d.nome} className="flex justify-between items-center py-2 text-sm">
                  <span className="text-gray-700">{d.nome}</span>
                  <span className="text-gray-500">{d.turni} turni · <span className="font-medium text-blue-700">{oreLabel(d.ore)}</span></span>
                </div>
              ))}
            </div>
          )}

          {anteprima.assenze.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Assenze nel periodo</h3>
              <div className="divide-y divide-gray-100">
                {anteprima.assenze.map(a => (
                  <div key={a.nome} className="py-2 text-sm flex justify-between items-center">
                    <span className="text-gray-700">{a.nome}</span>
                    <div className="flex gap-3 text-xs">
                      {a.ferie > 0 && <span className="text-green-700 font-medium">Ferie: {a.ferie}gg</span>}
                      {a.permesso > 0 && <span className="text-blue-700 font-medium">Permesso: {a.permesso}</span>}
                      {a.malattia > 0 && <span className="text-red-700 font-medium">Malattia: {a.malattia}gg</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => handleExport('pdf')} disabled={loading}>Scarica PDF</Button>
            <Button variant="secondary" onClick={() => handleExport('excel')} disabled={loading}>Scarica Excel</Button>
            <Button variant="secondary" onClick={() => handleExport('csv')} disabled={loading}>Scarica CSV</Button>
          </div>
        </div>
      )}
    </div>
  )
}
