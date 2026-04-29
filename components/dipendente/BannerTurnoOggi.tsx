'use client'
import { useState, useEffect } from 'react'
import { TurnoConDettagli } from '@/lib/types'
import { formatTimeShort } from '@/lib/utils/date'
import { haversineMetri } from '@/lib/utils/geo'

interface Props {
  turno: TurnoConDettagli | null
  onRefresh: () => void
}

type GeoStato = 'idle' | 'loading' | 'ok' | 'troppo_lontano' | 'negato' | 'errore'

function oraDaISO(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function salutoOggi(): string {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function BannerTurnoOggi({ turno, onRefresh }: Props) {
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [gpsGlobaleAbilitato, setGpsGlobaleAbilitato] = useState(true)
  const [geoStato, setGeoStato] = useState<GeoStato>('idle')
  const [distanzaMetri, setDistanzaMetri] = useState<number | null>(null)
  const [latPos, setLatPos] = useState<number | null>(null)
  const [lngPos, setLngPos] = useState<number | null>(null)
  const [modaleSblocco, setModaleSblocco] = useState(false)
  const [motivazioneSblocco, setMotivazioneSblocco] = useState('')
  const [loadingSblocco, setLoadingSblocco] = useState(false)
  const [erroreSblocco, setErroreSblocco] = useState('')
  const [sbloccoComunicato, setSbloccoComunicato] = useState(false)

  useEffect(() => {
    fetch('/api/impostazioni')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGpsGlobaleAbilitato(d.gps_checkin_abilitato) })
      .catch(() => {})
  }, [])

  const posto = turno?.posto
  const geoRichiesta = gpsGlobaleAbilitato && !!(posto?.geo_check_abilitato && posto.latitudine != null && posto.longitudine != null)
  const sbloccato = !!(turno?.sblocco_checkin_valido_fino &&
    new Date(turno.sblocco_checkin_valido_fino) > new Date())
  const haIngresso = !!turno?.ora_ingresso_effettiva
  const haUscita = !!turno?.ora_uscita_effettiva
  const statoTerminato = haIngresso && haUscita

  useEffect(() => {
    if (!geoRichiesta || haIngresso || sbloccato) return
    if (!navigator.geolocation) { setGeoStato('errore'); return }
    setGeoStato('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLatPos(lat)
        setLngPos(lng)
        const dist = haversineMetri(lat, lng, posto!.latitudine!, posto!.longitudine!)
        setDistanzaMetri(Math.round(dist))
        setGeoStato(dist <= posto!.raggio_metri ? 'ok' : 'troppo_lontano')
      },
      () => setGeoStato('negato'),
      { timeout: 10000, maximumAge: 30000 }
    )
  }, [geoRichiesta, haIngresso, sbloccato, posto])

  async function chiama(endpoint: 'check-in' | 'check-out') {
    if (!turno) return
    setLoading(true)
    setErrore('')
    const body = endpoint === 'check-in' && latPos != null && lngPos != null
      ? JSON.stringify({ latitudine: latPos, longitudine: lngPos })
      : undefined
    const res = await fetch(`/api/turni/${turno.id}/${endpoint}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body,
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErrore(d.error ?? 'Errore durante la timbratura')
      return
    }
    onRefresh()
  }

  async function inviaSblocco() {
    if (!turno || !motivazioneSblocco.trim()) { setErroreSblocco('Motivazione obbligatoria'); return }
    setLoadingSblocco(true)
    setErroreSblocco('')
    const res = await fetch('/api/richieste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'sblocco_checkin',
        turno_id: turno.id,
        note_dipendente: motivazioneSblocco.trim(),
      }),
    })
    setLoadingSblocco(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErroreSblocco(d.error ?? 'Errore invio richiesta')
      return
    }
    setModaleSblocco(false)
    setMotivazioneSblocco('')
    setSbloccoComunicato(true)
  }

  const checkInDisabilitato = geoRichiesta && !sbloccato && geoStato !== 'ok'

  if (!turno) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-5">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Oggi · {salutoOggi()}</p>
        <p className="mt-2 text-sm text-slate-600">Nessun turno in programma oggi.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5">
      <p className="text-xs uppercase tracking-wider font-semibold text-indigo-600">Oggi · {salutoOggi()}</p>

      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
        <p className="text-lg font-bold text-slate-900">
          {formatTimeShort(turno.ora_inizio)} – {formatTimeShort(turno.ora_fine)}
        </p>
        {turno.posto && (
          <p className="text-sm text-slate-600">· {turno.posto.nome}</p>
        )}
      </div>

      {(haIngresso || haUscita) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {haIngresso && (
            <span className="text-slate-700">
              <span className="text-slate-400">Iniziato alle </span>
              <span className="font-semibold">{oraDaISO(turno.ora_ingresso_effettiva!)}</span>
            </span>
          )}
          {haUscita && (
            <span className="text-slate-700">
              <span className="text-slate-400">Terminato alle </span>
              <span className="font-semibold">{oraDaISO(turno.ora_uscita_effettiva!)}</span>
            </span>
          )}
        </div>
      )}

      {/* Stato GPS */}
      {geoRichiesta && !haIngresso && !sbloccato && (
        <div className="mt-3 text-sm">
          {geoStato === 'loading' && (
            <p className="text-slate-500">Verifica posizione GPS…</p>
          )}
          {geoStato === 'ok' && (
            <p className="text-green-700 font-medium">Posizione verificata ✓{distanzaMetri != null ? ` (${distanzaMetri}m)` : ''}</p>
          )}
          {geoStato === 'troppo_lontano' && distanzaMetri != null && (
            <p className="text-amber-700">Sei a {distanzaMetri}m dal posto · devi essere entro {posto!.raggio_metri}m</p>
          )}
          {(geoStato === 'negato' || geoStato === 'errore') && (
            <p className="text-red-600">GPS non disponibile</p>
          )}
        </div>
      )}

      {/* Banner sblocco */}
      {sbloccato && !haIngresso && (
        <div className="mt-3 text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Sblocco approvato — puoi fare check-in entro 30 min
        </div>
      )}
      {sbloccoComunicato && !sbloccato && !haIngresso && (
        <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Richiesta sblocco inviata — attendi l&apos;approvazione
        </div>
      )}

      {errore && <p className="mt-3 text-sm text-red-600">{errore}</p>}

      <div className="mt-4 flex flex-wrap gap-2 items-center">
        {!haIngresso && (
          <button
            onClick={() => chiama('check-in')}
            disabled={loading || checkInDisabilitato}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm active:scale-95 transition"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            {loading ? 'Avvio…' : 'Inizia turno'}
          </button>
        )}

        {/* Pulsante sblocco */}
        {!haIngresso && geoRichiesta && !sbloccato && !sbloccoComunicato && (geoStato === 'negato' || geoStato === 'errore' || geoStato === 'troppo_lontano') && (
          <button
            onClick={() => setModaleSblocco(true)}
            className="text-sm text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-full font-medium transition"
          >
            {geoStato === 'troppo_lontano' ? 'Non riesco ad avvicinarmi' : 'Richiedi sblocco'}
          </button>
        )}

        {haIngresso && !haUscita && (
          <button
            onClick={() => chiama('check-out')}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm active:scale-95 transition"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            {loading ? 'Chiusura…' : 'Termina turno'}
          </button>
        )}
        {statoTerminato && (
          <span className="inline-flex items-center gap-2 bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-full">
            ✓ Turno completato
          </span>
        )}
      </div>

      {/* Modale sblocco inline */}
      {modaleSblocco && (
        <div className="mt-4 border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">Richiesta sblocco check-in</p>
          <p className="text-xs text-amber-700">Spiega perché non riesci a effettuare il check-in GPS. L&apos;admin riceverà la richiesta e potrà approvare uno sblocco di 30 minuti.</p>
          <textarea
            value={motivazioneSblocco}
            onChange={e => setMotivazioneSblocco(e.target.value)}
            rows={2}
            placeholder="es. Sono all'interno dell'edificio e il GPS non prende..."
            className="w-full border border-amber-300 rounded-lg p-2 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {erroreSblocco && <p className="text-xs text-red-600">{erroreSblocco}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setModaleSblocco(false); setMotivazioneSblocco(''); setErroreSblocco('') }}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              onClick={inviaSblocco}
              disabled={loadingSblocco}
              className="flex-1 bg-amber-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {loadingSblocco ? 'Invio…' : 'Invia richiesta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
