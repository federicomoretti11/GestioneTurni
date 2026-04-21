'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { createClient } from '@/lib/supabase/client'
import type { Profile, TurnoConDettagli } from '@/lib/types'
import { getWeekDays, getMonthDays, toDateString } from '@/lib/utils/date'
import { calcolaOreTurno } from '@/lib/utils/turni'
import { AlertErrore } from '@/components/ui/AlertErrore'
import { SkeletonCalendario } from '@/components/ui/SkeletonCalendario'

function oreLabel(ore: number) {
  return `${ore % 1 === 0 ? ore : ore.toFixed(1)}h`
}

export default function MieiTurniPage() {
  const [vista, setVista] = useState<'settimana' | 'mese'>('mese')
  const [dataCorrente, setDataCorrente] = useState(new Date())
  const [profilo, setProfilo] = useState<Profile | null>(null)
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const giorni = vista === 'settimana'
    ? getWeekDays(dataCorrente)
    : getMonthDays(dataCorrente.getFullYear(), dataCorrente.getMonth())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfilo(data))
    })
  }, [])

  const caricaTurni = useCallback(async () => {
    if (!profilo) return
    setErrore('')
    setLoading(true)
    try {
      const res = await fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`)
      const data = await res.json()
      setTurni(Array.isArray(data) ? data.filter((t: TurnoConDettagli) => t.dipendente_id === profilo.id) : [])
    } catch {
      setErrore('Errore nel caricamento dei turni. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [dataCorrente, vista, profilo])

  useEffect(() => { caricaTurni() }, [caricaTurni])

  function spostaData(direzione: 1 | -1) {
    const d = new Date(dataCorrente)
    if (vista === 'settimana') d.setDate(d.getDate() + direzione * 7)
    else d.setMonth(d.getMonth() + direzione)
    setDataCorrente(d)
  }

  const oreTotali = useMemo(() =>
    turni.reduce((sum, t) => sum + calcolaOreTurno(t.ora_inizio, t.ora_fine), 0)
  , [turni])

  const turniLavorativi = useMemo(() =>
    turni.filter(t => calcolaOreTurno(t.ora_inizio, t.ora_fine) > 0)
  , [turni])

  const turniRiposo = useMemo(() =>
    turni.filter(t => calcolaOreTurno(t.ora_inizio, t.ora_fine) === 0)
  , [turni])

  if (!profilo) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">I miei turni</h1>
        <SwitcherVista vista={vista} onChange={setVista} dataCorrente={dataCorrente} onPrev={() => spostaData(-1)} onNext={() => spostaData(1)} onOggi={() => setDataCorrente(new Date())} />
      </div>

      {errore && <AlertErrore messaggio={errore} onRetry={caricaTurni} />}

      {/* Riepilogo periodo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{oreLabel(oreTotali)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ore totali</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{turniLavorativi.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Turni lavorativi</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-400">{turniRiposo.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Riposi</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        {loading ? <SkeletonCalendario righe={1} colonne={giorni.length} /> : <GrigliaCalendario
          giorni={giorni}
          dipendenti={[profilo]}
          turni={turni}
          onAddTurno={() => {}}
          onEditTurno={() => {}}
          readonly
        />}
      </div>
    </div>
  )
}
