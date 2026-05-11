'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { ImpostazioniTenant } from '@/lib/types'

function Toggle({ label, valore, loading, onChange }: { label: string; valore: boolean; loading: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${valore ? 'bg-green-500' : 'bg-gray-300'}`}
      aria-label={label}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${valore ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function ToggleRow({ label, descrizione, valore, loading, onChange }: {
  label: string; descrizione: string; valore: boolean; loading: boolean; onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{descrizione}</p>
      </div>
      <Toggle label={label} valore={valore} loading={loading} onChange={onChange} />
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', manager: 'Manager', dipendente: 'Dipendente' }

function ModuloRow({ label, descrizione, valore, loading, onChange, ruoli, loadingRuoli, onToggleRuolo }: {
  label: string; descrizione: string; valore: boolean; loading: boolean; onChange: () => void
  ruoli: string[]; loadingRuoli: boolean; onToggleRuolo: (r: string) => void
}) {
  return (
    <div className="py-4 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{descrizione}</p>
        </div>
        <Toggle label={label} valore={valore} loading={loading} onChange={onChange} />
      </div>
      {valore && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Visibile a:</span>
          {(['admin', 'manager', 'dipendente'] as const).map(r => (
            <button
              key={r}
              onClick={() => onToggleRuolo(r)}
              disabled={loadingRuoli}
              className={`px-2 py-0.5 text-xs font-medium rounded-md border transition disabled:opacity-50 ${
                ruoli.includes(r)
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CardLink({
  icon, titolo, descrizione, href,
}: {
  icon: string; titolo: string; descrizione: string; href: string
}) {
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
  const router = useRouter()
  const [imp, setImp] = useState<ImpostazioniTenant | null>(null)
  const [loadingGps, setLoadingGps] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingCedolini, setLoadingCedolini] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingDocumenti, setLoadingDocumenti] = useState(false)
  const [loadingRuoli, setLoadingRuoli] = useState(false)
  const [testEmailStato, setTestEmailStato] = useState<'idle' | 'loading' | 'ok' | 'errore'>('idle')
  const [testEmailMsg, setTestEmailMsg] = useState('')

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
                `${(r.profile as {nome:string;cognome:string})?.cognome} ${(r.profile as {nome:string;cognome:string})?.nome}`,
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

  async function carica() {
    const res = await fetch('/api/impostazioni')
    if (res.ok) setImp(await res.json())
  }

  useEffect(() => { carica() }, [])

  async function inviaTestEmail() {
    setTestEmailStato('loading')
    setTestEmailMsg('')
    const res = await fetch('/api/admin/test-email', { method: 'POST' })
    const d = await res.json()
    if (res.ok) {
      setTestEmailStato('ok')
      setTestEmailMsg(`Email inviata a ${d.sentTo}`)
    } else {
      setTestEmailStato('errore')
      setTestEmailMsg(d.error ?? 'Errore sconosciuto')
    }
    setTimeout(() => setTestEmailStato('idle'), 5000)
  }

  async function toggle(campo: keyof ImpostazioniTenant, setLoading: (v: boolean) => void) {
    if (!imp) return
    setLoading(true)
    const nuovoValore = !imp[campo]
    await fetch('/api/impostazioni', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: nuovoValore }),
    })
    setImp(prev => prev ? { ...prev, [campo]: nuovoValore } : prev)
    setLoading(false)
    router.refresh()
  }

  async function toggleRuolo(campoRuoli: keyof ImpostazioniTenant, ruolo: string) {
    if (!imp) return
    const current = (imp[campoRuoli] as string[]) ?? []
    const nuovi = current.includes(ruolo) ? current.filter(r => r !== ruolo) : [...current, ruolo]
    setImp(prev => prev ? { ...prev, [campoRuoli]: nuovi } : prev)
    setLoadingRuoli(true)
    await fetch('/api/impostazioni', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campoRuoli]: nuovi }),
    })
    setLoadingRuoli(false)
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>

      {/* Impostazioni globali */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Impostazioni globali</h2>
        <div className="bg-white rounded-xl border border-slate-900/20 px-5 divide-y divide-slate-100">
          <ToggleRow
            label="GPS check-in"
            descrizione={
              imp?.gps_checkin_abilitato
                ? 'Attivo — la verifica posizione è abilitata per i posti configurati'
                : 'Disattivato — il pulsante "Inizia turno" è sempre abilitato per tutti'
            }
            valore={imp?.gps_checkin_abilitato ?? true}
            loading={loadingGps || !imp}
            onChange={() => toggle('gps_checkin_abilitato', setLoadingGps)}
          />
          <ToggleRow
            label="Email notifiche"
            descrizione={
              imp?.email_notifiche_abilitato
                ? 'Attivo — i dipendenti ricevono email per turni pubblicati, richieste e sblocchi'
                : 'Disattivato — nessuna email transazionale viene inviata'
            }
            valore={imp?.email_notifiche_abilitato ?? false}
            loading={loadingEmail || !imp}
            onChange={() => toggle('email_notifiche_abilitato', setLoadingEmail)}
          />
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Email di test</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {testEmailStato === 'ok' && <span className="text-green-600">{testEmailMsg}</span>}
                {testEmailStato === 'errore' && <span className="text-red-600">{testEmailMsg}</span>}
                {testEmailStato !== 'ok' && testEmailStato !== 'errore' && 'Invia un\'email di prova al tuo indirizzo per verificare la configurazione'}
              </p>
            </div>
            <button
              onClick={inviaTestEmail}
              disabled={testEmailStato === 'loading'}
              className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-900/20 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {testEmailStato === 'loading' ? 'Invio…' : 'Invia test'}
            </button>
          </div>
        </div>
      </section>

      {/* Moduli attivi */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Moduli attivi</h2>
        <div className="bg-white rounded-xl border border-slate-900/20 px-5 divide-y divide-slate-100">
          <ModuloRow
            label="Modulo Task"
            descrizione={imp?.modulo_tasks_abilitato ? 'Attivo — la sezione task è visibile e utilizzabile' : 'Disattivato — la sezione task è nascosta per tutti'}
            valore={imp?.modulo_tasks_abilitato ?? true}
            loading={loadingTasks || !imp}
            onChange={() => toggle('modulo_tasks_abilitato', setLoadingTasks)}
            ruoli={imp?.modulo_tasks_ruoli ?? ['admin', 'manager', 'dipendente']}
            loadingRuoli={loadingRuoli}
            onToggleRuolo={r => toggleRuolo('modulo_tasks_ruoli', r)}
          />
          <ModuloRow
            label="Modulo Documenti"
            descrizione={imp?.modulo_documenti_abilitato ? 'Attivo — l\'archivio documenti è accessibile' : 'Disattivato — l\'archivio documenti è nascosto per tutti'}
            valore={imp?.modulo_documenti_abilitato ?? true}
            loading={loadingDocumenti || !imp}
            onChange={() => toggle('modulo_documenti_abilitato', setLoadingDocumenti)}
            ruoli={imp?.modulo_documenti_ruoli ?? ['admin', 'manager', 'dipendente']}
            loadingRuoli={loadingRuoli}
            onToggleRuolo={r => toggleRuolo('modulo_documenti_ruoli', r)}
          />
          <ModuloRow
            label="Modulo Cedolini"
            descrizione={imp?.modulo_cedolini_abilitato ? 'Attivo — la gestione cedolini è abilitata' : 'Disattivato — non disponibile per questo tenant'}
            valore={imp?.modulo_cedolini_abilitato ?? false}
            loading={loadingCedolini || !imp}
            onChange={() => toggle('modulo_cedolini_abilitato', setLoadingCedolini)}
            ruoli={imp?.modulo_cedolini_ruoli ?? ['admin', 'manager', 'dipendente']}
            loadingRuoli={loadingRuoli}
            onToggleRuolo={r => toggleRuolo('modulo_cedolini_ruoli', r)}
          />
          <ModuloRow
            label="Modulo Analytics"
            descrizione={imp?.modulo_analytics_abilitato ? 'Attivo — le statistiche e i report sono accessibili' : 'Disattivato — non disponibile per questo tenant'}
            valore={imp?.modulo_analytics_abilitato ?? false}
            loading={loadingAnalytics || !imp}
            onChange={() => toggle('modulo_analytics_abilitato', setLoadingAnalytics)}
            ruoli={imp?.modulo_analytics_ruoli ?? ['admin', 'manager', 'dipendente']}
            loadingRuoli={loadingRuoli}
            onToggleRuolo={r => toggleRuolo('modulo_analytics_ruoli', r)}
          />
        </div>
      </section>

      {/* Gestione */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Gestione</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardLink icon="👥" titolo="Utenti" descrizione="Gestisci dipendenti, manager e ruoli" href="/admin/utenti" />
          <CardLink icon="🏢" titolo="Posti di servizio" descrizione="Sedi, coordinate GPS e raggio check-in" href="/admin/posti" />
          <CardLink icon="🎉" titolo="Festivi" descrizione="Giorni festivi nazionali, patronali e custom" href="/admin/festivi" />
        </div>
      </section>

      {/* Sistema */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardLink icon="📤" titolo="Export turni" descrizione="Esporta presenze e ore in PDF, Excel o CSV" href="/admin/export" />
          <CardLink icon="📋" titolo="Audit log" descrizione="Traccia di tutte le azioni amministrative" href="/admin/audit" />
          <CardLink icon="🏷️" titolo="Modelli turno" descrizione="Template riutilizzabili per la pianificazione" href="/admin/template" />
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
