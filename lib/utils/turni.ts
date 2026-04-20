function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function calcolaOreTurno(oraInizio: string, oraFine: string): number {
  const start = timeToMinutes(oraInizio)
  let end = timeToMinutes(oraFine)
  if (end <= start) end += 24 * 60
  return (end - start) / 60
}

export function isOrarioValido(oraInizio: string, oraFine: string): boolean {
  return oraInizio !== oraFine
}
