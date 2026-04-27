// lib/richieste/validations.ts
import type { TipoRichiesta, StatoRichiesta, RuoloUtente } from '@/lib/types'
import { LEAD_TIMES_MS, LEAD_TIME_LABEL, TRANSIZIONI_VALIDE } from './config'

export function validateLeadTime(tipo: TipoRichiesta, dataInizio: string): string | null {
  const leadTime = LEAD_TIMES_MS[tipo]
  if (leadTime === 0) return null
  const inizio = new Date(dataInizio).getTime()
  const adesso = Date.now()
  if (inizio - adesso < leadTime) {
    return `Le richieste di tipo "${tipo}" vanno inviate con almeno ${LEAD_TIME_LABEL[tipo]} di anticipo.`
  }
  return null
}

export function validateStatoTransition(
  statoCorrente: StatoRichiesta,
  nuovoStato: StatoRichiesta,
  ruolo: RuoloUtente
): string | null {
  const ok = TRANSIZIONI_VALIDE.some(
    t => t.da === statoCorrente && t.a === nuovoStato && t.ruoli.includes(ruolo)
  )
  if (!ok) return `Transizione ${statoCorrente} → ${nuovoStato} non consentita per ruolo ${ruolo}.`
  return null
}
