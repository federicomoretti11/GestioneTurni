'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

type GiornoReport = { data: string; giorno: number; confermati: number; minimo: number; ok: boolean }
type PostoReport = { posto_id: string; posto_nome: string; giorni: GiornoReport[] }
type FabbisognoGiorno = { giorno_settimana: number; label: string; min_persone: number }

const GIORNI_BREVI = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

function lunediCorrente(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function StaffingPage() {
  const [settimana, setSettimana] = useState(lunediCorrente)
  const [report, setReport] = useState<PostoReport[]>([])
  const [loading, setLoading] = useState(false)
  const [configAperto, setConfigAperto] = useState<string | null>(null)
  const [fabbisogni, setFabbisogni] = useState<Record<string, FabbisognoGiorno[]>>({})
  const [salvando, setSalvando] = useState(false)

  async function caricaReport(s: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/staffing?settimana=${s}`)
    if (res.ok) {
      const data = await res.json() as { posti: PostoReport[] }
      setReport(data.posti)
    }
    setLoading(false)
  }

  useEffect(() => { caricaReport(settimana) }, [settimana])

  async function apriConfig(postoId: string) {
    if (configAperto === postoId) { setConfigAperto(null); return }
    setConfigAperto(postoId)
    if (!fabbisogni[postoId]) {
      const res = await fetch(`/api/admin/staffing/posti/${postoId}`)
      if (res.ok) {
        const data = await res.json() as FabbisognoGiorno[]
        setFabbisogni(f => ({ ...f, [postoId]: data }))
      }
    }
  }

  async function salvaFabbisogno(postoId: string) {
    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/staffing/posti/${postoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fabbisogno: fabbisogni[postoId] }),
      })
      if (!res.ok) { alert('Errore salvataggio'); return }
      caricaReport(settimana)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Staffing</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSettimana(s => addDays(s, -7))}>← Prec.</Button>
          <span className="text-sm text-gray-600 font-medium">{settimana} — {addDays(settimana, 6)}</span>
          <Button variant="secondary" size="sm" onClick={() => setSettimana(s => addDays(s, 7))}>Succ. →</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-3 font-medium text-gray-700">Posto</th>
                {GIORNI_BREVI.map((g, i) => (
                  <th key={i} className="text-center p-3 font-medium text-gray-700 min-w-[70px]">{g}</th>
                ))}
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {report.map(posto => (
                <>
                  <tr key={posto.posto_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{posto.posto_nome}</td>
                    {posto.giorni.map(g => (
                      <td key={g.giorno} className="p-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          g.minimo === 0 ? 'bg-gray-100 text-gray-500'
                          : g.ok ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          {g.confermati}/{g.minimo}
                        </span>
                      </td>
                    ))}
                    <td className="p-2">
                      <button
                        onClick={() => apriConfig(posto.posto_id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {configAperto === posto.posto_id ? 'Chiudi' : 'Configura'}
                      </button>
                    </td>
                  </tr>
                  {configAperto === posto.posto_id && fabbisogni[posto.posto_id] && (
                    <tr key={`${posto.posto_id}-config`} className="bg-blue-50">
                      <td colSpan={9} className="p-4">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Minimo persone per giorno:</p>
                          <div className="grid grid-cols-7 gap-2">
                            {fabbisogni[posto.posto_id].map(f => (
                              <div key={f.giorno_settimana} className="space-y-1">
                                <label className="text-xs text-gray-500">{f.label.slice(0,3)}</label>
                                <input
                                  type="number" min={0} max={99}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center"
                                  value={f.min_persone}
                                  onChange={e => setFabbisogni(prev => ({
                                    ...prev,
                                    [posto.posto_id]: prev[posto.posto_id].map(x =>
                                      x.giorno_settimana === f.giorno_settimana
                                        ? { ...x, min_persone: parseInt(e.target.value) || 0 }
                                        : x
                                    )
                                  }))}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" onClick={() => salvaFabbisogno(posto.posto_id)} disabled={salvando}>
                              {salvando ? 'Salvataggio...' : 'Salva'}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {report.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-sm text-gray-400">
                    Nessun posto di servizio attivo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
