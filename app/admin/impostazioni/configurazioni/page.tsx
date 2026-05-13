'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

export default function ConfigurazioniPage() {
  const router = useRouter()
  const [imp, setImp] = useState<ImpostazioniTenant | null>(null)
  const [loadingGps, setLoadingGps] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingCedolini, setLoadingCedolini] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingDocumenti, setLoadingDocumenti] = useState(false)
  const [loadingRuoli, setLoadingRuoli] = useState(false)
  const [loadingContratti, setLoadingContratti] = useState(false)
  const [loadingStraordinari, setLoadingStraordinari] = useState(false)
  const [loadingFerieCont, setLoadingFerieCont] = useState(false)
  const [loadingStaffing, setLoadingStaffing] = useState(false)
  const [loadingIndisponibilita, setLoadingIndisponibilita] = useState(false)
  const [testEmailStato, setTestEmailStato] = useState<'idle' | 'loading' | 'ok' | 'errore'>('idle')
  const [testEmailMsg, setTestEmailMsg] = useState('')

  useEffect(() => {
    fetch('/api/impostazioni').then(r => r.json()).then(setImp)
  }, [])

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
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/impostazioni" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">← Impostazioni</Link>
      <h1 className="text-xl font-bold text-gray-900">Configurazioni</h1>

      <div className="bg-white rounded-xl border border-slate-900/20 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>

        {/* Generali */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Generali</p>
        </div>
        <div className="px-5 divide-y divide-slate-100">
          <ToggleRow
            label="GPS check-in"
            descrizione={imp?.gps_checkin_abilitato ? 'Attivo — la verifica posizione è abilitata per i posti configurati' : 'Disattivato — il pulsante "Inizia turno" è sempre abilitato per tutti'}
            valore={imp?.gps_checkin_abilitato ?? true}
            loading={loadingGps || !imp}
            onChange={() => toggle('gps_checkin_abilitato', setLoadingGps)}
          />
          <ToggleRow
            label="Email notifiche"
            descrizione={imp?.email_notifiche_abilitato ? 'Attivo — i dipendenti ricevono email per turni pubblicati, richieste e sblocchi' : 'Disattivato — nessuna email transazionale viene inviata'}
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
                {testEmailStato !== 'ok' && testEmailStato !== 'errore' && "Invia un'email di prova al tuo indirizzo per verificare la configurazione"}
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

        {/* Moduli */}
        <div className="px-5 py-3 bg-slate-50 border-y border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Moduli</p>
        </div>
        <div className="px-5 divide-y divide-slate-100">
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
            descrizione={imp?.modulo_documenti_abilitato ? "Attivo — l'archivio documenti è accessibile" : "Disattivato — l'archivio documenti è nascosto per tutti"}
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

        {/* Moduli HR avanzati — visibili solo se almeno uno abilitato */}
        {(imp?.modulo_contratti_abilitato || imp?.modulo_straordinari_abilitato || imp?.modulo_ferie_contatori_abilitato || imp?.modulo_staffing_abilitato || imp?.modulo_indisponibilita_abilitato) && (
          <>
            <div className="px-5 py-3 bg-slate-50 border-y border-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Moduli HR avanzati</p>
            </div>
            <div className="px-5 divide-y divide-slate-100">
              {imp?.modulo_contratti_abilitato && (
                <ToggleRow
                  label="Contratti e orario contrattuale"
                  descrizione="Gestione tipo contratto, ore settimanali previste, full-time/part-time"
                  valore={imp.modulo_contratti_abilitato}
                  loading={loadingContratti}
                  onChange={() => toggle('modulo_contratti_abilitato', setLoadingContratti)}
                />
              )}
              {imp?.modulo_straordinari_abilitato && (
                <ToggleRow
                  label="Calcolo straordinari automatico"
                  descrizione="Ore effettive vs. pianificate, straordinari ordinari/notturni/festivi, ore mancanti"
                  valore={imp.modulo_straordinari_abilitato}
                  loading={loadingStraordinari}
                  onChange={() => toggle('modulo_straordinari_abilitato', setLoadingStraordinari)}
                />
              )}
              {imp?.modulo_ferie_contatori_abilitato && (
                <ToggleRow
                  label="Contatori ferie, permessi e ROL"
                  descrizione="Giorni ferie maturati/fruiti/residui, monte ore ROL, contatore malattie per dipendente"
                  valore={imp.modulo_ferie_contatori_abilitato}
                  loading={loadingFerieCont}
                  onChange={() => toggle('modulo_ferie_contatori_abilitato', setLoadingFerieCont)}
                />
              )}
              {imp?.modulo_staffing_abilitato && (
                <ToggleRow
                  label="Pianificazione fabbisogno (staffing)"
                  descrizione="Definisci quante persone servono per turno/posto, rileva sotto e sovra-organico"
                  valore={imp.modulo_staffing_abilitato}
                  loading={loadingStaffing}
                  onChange={() => toggle('modulo_staffing_abilitato', setLoadingStaffing)}
                />
              )}
              {imp?.modulo_indisponibilita_abilitato && (
                <ToggleRow
                  label="Indisponibilità e preferenze dipendente"
                  descrizione="Il dipendente dichiara giorni/orari in cui non è disponibile per la pianificazione"
                  valore={imp.modulo_indisponibilita_abilitato}
                  loading={loadingIndisponibilita}
                  onChange={() => toggle('modulo_indisponibilita_abilitato', setLoadingIndisponibilita)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
