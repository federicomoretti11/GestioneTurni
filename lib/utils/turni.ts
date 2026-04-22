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
