'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Impostazioni {
  gps_checkin_abilitato: boolean
  email_notifiche_abilitato: boolean
}

function ToggleRow({
  label,
  descrizione,
  valore,
  loading,
  onChange,
}: {
  label: string
  descrizione: string
  valore: boolean
  loading: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{descrizione}</p>
      </div>
      <button
        onClick={onChange}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          valore ? 'bg-green-500' : 'bg-gray-300'
        }`}
        aria-label={label}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
          valore ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
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
      className="flex flex-col gap-2 bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
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
  const [imp, setImp] = useState<Impostazioni | null>(null)
  const [loadingGps, setLoadingGps] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)

  async function carica() {
    const res = await fetch('/api/impostazioni')
    if (res.ok) setImp(await res.json())
  }

  useEffect(() => { carica() }, [])

  async function toggle(campo: keyof Impostazioni, setLoading: (v: boolean) => void) {
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
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>

      {/* Impostazioni globali */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Impostazioni globali</h2>
        <div className="bg-white rounded-xl border border-gray-200 px-5 divide-y divide-gray-100">
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
        </div>
      </section>

      {/* Gestione */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Gestione</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardLink
            icon="👥"
            titolo="Utenti"
            descrizione="Gestisci dipendenti, manager e ruoli"
            href="/admin/utenti"
          />
          <CardLink
            icon="🏢"
            titolo="Posti di servizio"
            descrizione="Sedi, coordinate GPS e raggio check-in"
            href="/admin/posti"
          />
          <CardLink
            icon="🎉"
            titolo="Festivi"
            descrizione="Giorni festivi nazionali, patronali e custom"
            href="/admin/festivi"
          />
        </div>
      </section>

      {/* Sistema */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            icon="📋"
            titolo="Audit log"
            descrizione="Traccia di tutte le azioni amministrative"
            href="/admin/audit"
          />
          <CardLink
            icon="🏷️"
            titolo="Modelli turno"
            descrizione="Template riutilizzabili per la pianificazione"
            href="/admin/template"
          />
        </div>
      </section>
    </div>
  )
}
