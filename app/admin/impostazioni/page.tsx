'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { generaSigla } from '@/lib/utils/matricola'

function CardLink({ icon, titolo, descrizione, href }: { icon: string; titolo: string; descrizione: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 bg-white rounded-xl border border-slate-900/20 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{titolo}</p>
        <p className="text-xs text-gray-500 mt-0.5">{descrizione}</p>
      </div>
      <span className="text-xs text-blue-600 font-medium mt-auto">Apri →</span>
    </Link>
  )
}

export default function ImpostazioniPage() {
  const [sigla, setSigla] = useState('')
  const [siglaSalvata, setSiglaSalvata] = useState('')
  const [savingSigla, setSavingSigla] = useState(false)
  const [siglaMsg, setSiglaMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/sigla').then(r => r.json()).then(s => {
      const val = s.sigla ?? generaSigla(s.nomeTenant ?? '')
      setSigla(val)
      setSiglaSalvata(s.sigla ?? '')
    })
  }, [])

  async function scaricaDati(tipo: 'dipendenti' | 'richieste', formato: 'csv' | 'json') {
    const res = await fetch(`/api/admin/export-dati?tipo=${tipo}`)
    if (!res.ok) return
    const dati = await res.json()

    let contenuto: string
    let mimeType: string
    let estensione: string

    if (formato === 'json') {
      contenuto = JSON.stringify(dati, null, 2)
      mimeType = 'application/json'
      estensione = 'json'
    } else {
      if (dati.length === 0) { contenuto = ''; mimeType = 'text/csv'; estensione = 'csv' }
      else {
        const intestazioni = tipo === 'dipendenti'
          ? ['Nome', 'Cognome', 'Ruolo', 'Attivo', 'Data creazione']
          : ['Dipendente', 'Tipo', 'Data inizio', 'Data fine', 'Stato', 'Note', 'Data richiesta']
        const righe = dati.map((r: Record<string, unknown>) =>
          tipo === 'dipendenti'
            ? [r.nome, r.cognome, r.ruolo, r.attivo ? 'Sì' : 'No', (r.created_at as string).slice(0, 10)]
            : [
                `${(r.profile as { nome: string; cognome: string })?.cognome} ${(r.profile as { nome: string; cognome: string })?.nome}`,
                r.tipo, r.data_inizio, r.data_fine, r.stato, r.note ?? '', (r.created_at as string).slice(0, 10),
              ]
        )
        contenuto = [intestazioni, ...righe].map(r => r.map((v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
        mimeType = 'text/csv'
        estensione = 'csv'
      }
    }

    const blob = new Blob([contenuto], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tipo}_${new Date().toISOString().slice(0, 10)}.${estensione}`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function salvaSigla() {
    if (!sigla) return
    setSavingSigla(true)
    setSiglaMsg(null)
    const res = await fetch('/api/admin/sigla', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sigla }),
    })
    if (res.ok) {
      setSiglaSalvata(sigla)
      setSiglaMsg({ tipo: 'ok', testo: 'Sigla salvata. I nuovi utenti riceveranno matricole con questo prefisso.' })
    } else {
      const d = await res.json()
      setSiglaMsg({ tipo: 'errore', testo: d.error ?? 'Errore nel salvataggio' })
    }
    setSavingSigla(false)
    setTimeout(() => setSiglaMsg(null), 5000)
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>

      {/* Gestione */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Gestione</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CardLink icon="⚙️" titolo="Configurazioni" descrizione="GPS, email, moduli e funzionalità HR" href="/admin/impostazioni/configurazioni" />
          <CardLink icon="👥" titolo="Utenti" descrizione="Gestisci dipendenti, manager e ruoli" href="/admin/utenti" />
          <CardLink icon="🏢" titolo="Posti di servizio" descrizione="Sedi, coordinate GPS e raggio check-in" href="/admin/posti" />
          <CardLink icon="🎉" titolo="Festivi" descrizione="Giorni festivi nazionali, patronali e custom" href="/admin/festivi" />
        </div>
      </section>

      {/* Sistema */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Sistema</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <CardLink icon="📤" titolo="Export turni" descrizione="Esporta presenze e ore in PDF, Excel o CSV" href="/admin/export" />
          <CardLink icon="📋" titolo="Audit log" descrizione="Traccia di tutte le azioni amministrative" href="/admin/audit" />
          <CardLink icon="🏷️" titolo="Modelli turno" descrizione="Template riutilizzabili per la pianificazione" href="/admin/template" />
        </div>
      </section>

      {/* Codice dipendenti */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Codice dipendenti</h2>
        <div className="bg-white rounded-xl border border-slate-900/20 px-5 py-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Sigla aziendale</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Prefisso usato per generare la matricola dei dipendenti (es. sigla <strong>RSS</strong> → matricole RSS0001, RSS0002…).
              {siglaSalvata && <span className="ml-1 text-green-600">Sigla attiva: <strong>{siglaSalvata}</strong></span>}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-36">
              <Input
                label=""
                value={sigla}
                onChange={e => setSigla(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                placeholder="es. RSS"
                maxLength={5}
              />
            </div>
            <Button onClick={salvaSigla} disabled={savingSigla || !sigla || sigla === siglaSalvata}>
              {savingSigla ? 'Salvataggio…' : 'Salva sigla'}
            </Button>
          </div>
          {siglaMsg && (
            <p className={`text-xs ${siglaMsg.tipo === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{siglaMsg.testo}</p>
          )}
        </div>
      </section>

      {/* Privacy e GDPR */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Privacy e GDPR</h2>
        <div className="bg-white rounded-xl border border-slate-900/20 px-5 py-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Esporta dati aziendali</p>
            <p className="text-xs text-gray-500 mt-0.5">Portabilità dei dati ai sensi del GDPR art. 20</p>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Dipendenti</p>
                <p className="text-xs text-gray-400">Nome, ruolo, stato, data creazione</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => scaricaDati('dipendenti', 'csv')}>CSV</Button>
                <Button size="sm" variant="secondary" onClick={() => scaricaDati('dipendenti', 'json')}>JSON</Button>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Richieste</p>
                <p className="text-xs text-gray-400">Ferie, permessi, malattie con stati</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => scaricaDati('richieste', 'csv')}>CSV</Button>
                <Button size="sm" variant="secondary" onClick={() => scaricaDati('richieste', 'json')}>JSON</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
