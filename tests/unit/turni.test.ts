import { describe, it, expect } from 'vitest'
import { calcolaOreTurno, isOrarioValido } from '@/lib/utils/turni'

describe('calcolaOreTurno', () => {
  it('calcola le ore di un turno normale', () => {
    expect(calcolaOreTurno('08:00:00', '16:00:00')).toBe(8)
  })
  it('gestisce un turno a cavallo della mezzanotte', () => {
    expect(calcolaOreTurno('22:00:00', '06:00:00')).toBe(8)
  })
})

describe('isOrarioValido', () => {
  it('ritorna true per orari validi diversi', () => {
    expect(isOrarioValido('08:00:00', '16:00:00')).toBe(true)
  })
  it('ritorna false se inizio === fine', () => {
    expect(isOrarioValido('08:00:00', '08:00:00')).toBe(false)
  })
})
