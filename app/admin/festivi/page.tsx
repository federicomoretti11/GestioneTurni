'use client'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Festivo } from '@/lib/types'
import { invalidaFestivi } from '@/lib/hooks/useFestivi'

function formatData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function labelTipo(tipo: Festivo['tipo']) {
  switch (tipo) {
    case 'nazionale': return 'Nazionale'
    case 'patronale': return 'Patronale'
    case 'custom':    return 'Custom'
  }
}

function coloreTipo(tipo: Festivo['tipo']) {
  switch (tipo) {
    case 'nazionale': return 'bg-blue-100 text-blue-700'
    case 'patronale': return 'bg-amber-100 text-amber-700'
    case 'custom':    return 'bg-gray-100 text-gray-700'
  }
}

export default function FestiviPage() {
  const annoCorrente = new Date().getFullYear()
  const [festivi, setFestivi] = useState<Festivo[]>([])
  const [annoFiltro, setAnnoFiltro] = useState<number>(annoCorrente)
  const [form, setForm] = useState({ data: '', nome: '', tipo: 'patronale' as Festivo['tipo'] })
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  async function carica(anno: number) {
    const res = await fetch(`/api/festivi?anno=${anno}`)
    const data = await res.json()
    setFestivi(Array.isArray(data) ? data : [])
  }

  useEffect(() => { carica(annoFiltro) }, [annoFiltro])

  async function generaAnno() {
    setLoading(true)
    try {
      const res = await fetch('/api/festivi/genera-anno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anno: annoFiltro }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
        setErrore(err.error ?? 'Errore durante la generazione')
        return
      }
      setErrore('')
      invalidaFestivi()
      await carica(annoFiltro)
    } finally {
      setLoading(false)
    }
  }

  async function handleAggiungi(e: React.FormEvent) {
    e.preventDefault()
    if (!form.data) { setErrore('La data è obbligatoria'); return }
    if (!form.nome.trim()) { setErrore('Il nome è obbligatorio'); return }

    const res = await fetch('/api/festivi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: form.data, nome: form.nome.trim(), tipo: form.tipo }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Errore' }))
      setErrore(err.error ?? 'Errore durante il salvataggio')
      return
    }
    setForm({ data: '', nome: '', tipo: 'patronale' })
    setErrore('')
    invalidaFestivi()
    const annoNuovo = Number(form.data.slice(0, 4))
    if (annoNuovo === annoFiltro) carica(annoFiltro)
    else setAnnoFiltro(annoNuovo)
  }

  async function handleElimina(f: Festivo) {
    if (!confirm(`Eliminare il festivo "${f.nome}" del ${formatData(f.data)}?`)) return
    await fetch(`/api/festivi/${f.data}`, { method: 'DELETE' })
    invalidaFestivi()
    carica(annoFiltro)
  }

  const anniDisponibili = useMemo(() => {
    const base = annoCorrente
    return [base - 1, base, base + 1, base + 2]
  }, [annoCorrente])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Festivi</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Anno</label>
          <select
            value={annoFiltro}
            onChange={e => setAnnoFiltro(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-blue-900">
          <strong>Genera festivi nazionali {annoFiltro}</strong>
          <p className="text-blue-700 text-xs mt-0.5">
            Inserisce Capodanno, Pasqua, 25 aprile, 1 maggio, 2 giugno, Ferragosto, ecc. È idempotente: puoi rieseguirlo senza problemi.
          </p>
        </div>
        <Button onClick={generaAnno} disabled={loading}>
          {loading ? 'Generazione…' : `Genera ${annoFiltro}`}
        </Button>
      </div>

      <form onSubmit={handleAggiungi} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Aggiungi festivo patronale o custom</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Data *"
            type="date"
            value={form.data}
            onChange={e => { setForm(f => ({ ...f, data: e.target.value })); setErrore('') }}
          />
          <Input
            label="Nome *"
            value={form.nome}
            onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); setErrore('') }}
            placeholder="es. Santo Patrono"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Festivo['tipo'] }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="patronale">Patronale</option>
              <option value="custom">Custom</option>
              <option value="nazionale">Nazionale</option>
            </select>
          </div>
        </div>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
        <div className="flex justify-end">
          <Button type="submit">Aggiungi</Button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y">
        {festivi.map(f => (
          <div key={f.data} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 flex-shrink-0 text-center">
                <div className="text-lg font-bold text-gray-800 leading-none">{f.data.slice(8, 10)}</div>
                <div className="text-[10px] text-gray-500 uppercase mt-0.5">{f.data.slice(5, 7)}/{f.data.slice(0, 4)}</div>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{f.nome}</p>
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 ${coloreTipo(f.tipo)}`}>
                  {labelTipo(f.tipo)}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleElimina(f)}
              className="text-sm text-red-600 hover:underline flex-shrink-0 ml-3"
            >
              Elimina
            </button>
          </div>
        ))}
        {festivi.length === 0 && (
          <EmptyState
            icon="🎉"
            title={`Nessun festivo per ${annoFiltro}`}
            description="Usa il bottone in alto per generare i festivi nazionali, o aggiungi un festivo patronale."
            size="sm"
          />
        )}
      </div>
    </div>
  )
}
