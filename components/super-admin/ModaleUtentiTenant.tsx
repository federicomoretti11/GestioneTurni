'use client'
import { useEffect, useState } from 'react'

interface UtenteRow {
  id: string
  nome: string
  cognome: string
  email: string
  ruolo: 'admin' | 'manager' | 'dipendente'
  attivo: boolean
  created_at: string
}

const RUOLO_COLORS: Record<string, string> = {
  admin: 'bg-amber-100 text-amber-700',
  manager: 'bg-blue-100 text-blue-700',
  dipendente: 'bg-slate-100 text-slate-600',
}

export function ModaleUtentiTenant({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [utenti, setUtenti] = useState<UtenteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  // stato per azioni inline
  const [azioneAttiva, setAzioneAttiva] = useState<{ uid: string; tipo: 'password_temp' | 'ruolo' } | null>(null)
  const [passwordTemp, setPasswordTemp] = useState('')
  const [ruoloDraft, setRuoloDraft] = useState<UtenteRow['ruolo']>('dipendente')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ uid: string; msg: string; ok: boolean } | null>(null)

  async function carica() {
    setLoading(true)
    setErrore('')
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/utenti`)
      if (!res.ok) { setErrore('Errore nel caricamento utenti.'); return }
      setUtenti(await res.json())
    } catch { setErrore('Errore di rete.') }
    finally { setLoading(false) }
  }

  useEffect(() => { carica() }, [tenantId])

  async function eseguiAzione(uid: string, body: Record<string, unknown>) {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/utenti/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setFeedback({ uid, msg: json.error ?? 'Errore', ok: false })
      } else {
        setFeedback({ uid, msg: json.messaggio ?? 'Operazione completata', ok: true })
        setAzioneAttiva(null)
        setPasswordTemp('')
        await carica()
      }
    } catch { setFeedback({ uid, msg: 'Errore di rete', ok: false }) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Gestione utenti</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading && <p className="text-sm text-slate-400 text-center py-8">Caricamento…</p>}
          {errore && <p className="text-sm text-red-500 text-center py-8">{errore}</p>}
          {!loading && !errore && utenti.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Nessun utente in questo tenant.</p>
          )}
          {!loading && utenti.map(u => (
            <div key={u.id} className="border border-slate-100 rounded-xl mb-3 overflow-hidden">
              {/* Riga principale */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.cognome} {u.nome}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${RUOLO_COLORS[u.ruolo]}`}>
                  {u.ruolo}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${u.attivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {u.attivo ? 'Attivo' : 'Disattivo'}
                </span>
              </div>

              {/* Feedback inline */}
              {feedback?.uid === u.id && (
                <div className={`px-4 py-2 text-xs font-medium ${feedback.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {feedback.msg}
                </div>
              )}

              {/* Azioni */}
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {/* Reset password via email */}
                <button
                  onClick={() => eseguiAzione(u.id, { azione: 'reset_password' })}
                  disabled={saving}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Invia reset password
                </button>

                {/* Password temporanea */}
                {azioneAttiva?.uid === u.id && azioneAttiva.tipo === 'password_temp' ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="text"
                      value={passwordTemp}
                      onChange={e => setPasswordTemp(e.target.value)}
                      placeholder="min 8 caratteri"
                      className="text-xs border border-slate-300 rounded-md px-2 py-1 w-36"
                    />
                    <button
                      onClick={() => eseguiAzione(u.id, { azione: 'set_password', password: passwordTemp })}
                      disabled={saving || passwordTemp.length < 8}
                      className="text-xs px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? '…' : 'Imposta'}
                    </button>
                    <button
                      onClick={() => { setAzioneAttiva(null); setPasswordTemp('') }}
                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAzioneAttiva({ uid: u.id, tipo: 'password_temp' }); setFeedback(null) }}
                    className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    Password temporanea
                  </button>
                )}

                {/* Cambio ruolo */}
                {azioneAttiva?.uid === u.id && azioneAttiva.tipo === 'ruolo' ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={ruoloDraft}
                      onChange={e => setRuoloDraft(e.target.value as UtenteRow['ruolo'])}
                      className="text-xs border border-slate-300 rounded-md px-2 py-1"
                    >
                      <option value="dipendente">Dipendente</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => eseguiAzione(u.id, { azione: 'cambia_ruolo', ruolo: ruoloDraft })}
                      disabled={saving || ruoloDraft === u.ruolo}
                      className="text-xs px-2.5 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {saving ? '…' : 'Salva'}
                    </button>
                    <button
                      onClick={() => setAzioneAttiva(null)}
                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAzioneAttiva({ uid: u.id, tipo: 'ruolo' }); setRuoloDraft(u.ruolo); setFeedback(null) }}
                    className="text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    Cambia ruolo
                  </button>
                )}

                {/* Attiva / Disattiva */}
                <button
                  onClick={() => eseguiAzione(u.id, { azione: 'toggle_attivo' })}
                  disabled={saving}
                  className={`text-xs px-2.5 py-1 rounded-md disabled:opacity-50 ${
                    u.attivo
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {u.attivo ? 'Disattiva' : 'Attiva'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
