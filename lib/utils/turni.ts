import type { DipendenteCustom, Profile } from '@/lib/types'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function calcolaOreTurno(oraInizio: string, oraFine: string): number {
  if (oraInizio === oraFine) return 0  // turno di riposo
  const start = timeToMinutes(oraInizio)
  let end = timeToMinutes(oraFine)
  if (end <= start) end += 24 * 60
  return (end - start) / 60
}

export function isOrarioValido(_oraInizio: string, _oraFine: string): boolean {
  return true  // orari uguali = riposo (0 ore), è valido
}

// Fascia notturna: 22:00 → 06:00 del giorno successivo
const NOTTURNA_INIZIO = 22 * 60
const NOTTURNA_FINE = 6 * 60

export function calcolaOreDiurneNotturne(oraInizio: string, oraFine: string): { diurne: number; notturne: number } {
  if (oraInizio === oraFine) return { diurne: 0, notturne: 0 }
  const start = timeToMinutes(oraInizio)
  let end = timeToMinutes(oraFine)
  if (end <= start) end += 24 * 60
  const totale = end - start

  // Tre istanze della fascia notturna (giorno precedente, corrente, successivo)
  // per coprire qualunque turno che parta fino a 23:59 e duri fino a ~24h.
  const fasce: Array<[number, number]> = [
    [NOTTURNA_INIZIO - 1440, NOTTURNA_FINE],           // 00:00-06:00 del giorno corrente
    [NOTTURNA_INIZIO, NOTTURNA_FINE + 1440],           // 22:00-06:00 wrap
    [NOTTURNA_INIZIO + 1440, NOTTURNA_FINE + 2880],    // 22:00-06:00 giorno successivo
  ]

  let notturneMin = 0
  for (const [fa, fb] of fasce) {
    const overlap = Math.max(0, Math.min(end, fb) - Math.max(start, fa))
    notturneMin += overlap
  }

  return {
    diurne: (totale - notturneMin) / 60,
    notturne: notturneMin / 60,
  }
}

export function isTurnoBloccato(turno: { data: string; ora_inizio: string }): boolean {
  const now = new Date()
  const oggi = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (turno.data < oggi) return true
  if (turno.data === oggi) {
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return turno.ora_inizio.slice(0, 5) <= hhmm
  }
  return false
}

export type StatoTimbratura = 'non_iniziato' | 'in_corso' | 'completato'

export function statoTimbratura(t: {
  ora_ingresso_effettiva: string | null
  ora_uscita_effettiva: string | null
}): StatoTimbratura {
  if (t.ora_ingresso_effettiva && t.ora_uscita_effettiva) return 'completato'
  if (t.ora_ingresso_effettiva) return 'in_corso'
  return 'non_iniziato'
}

export function nomeDipendente(turno: {
  profile?: Profile | null
  dipendente_custom?: DipendenteCustom | null
}): string {
  if (turno.profile) return `${turno.profile.cognome} ${turno.profile.nome}`
  if (turno.dipendente_custom) return `${turno.dipendente_custom.cognome} ${turno.dipendente_custom.nome}`
  return '—'
}
