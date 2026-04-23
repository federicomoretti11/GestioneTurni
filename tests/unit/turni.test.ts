import { describe, it, expect } from 'vitest'
import { calcolaOreTurno, isOrarioValido, statoTimbratura } from '@/lib/utils/turni'

describe('calcolaOreTurno', () => {
  it('calcola le ore di un turno normale', () => {
    expect(calcolaOreTurno('08:00:00', '16:00:00')).toBe(8)
  })
  it('gestisce un turno a cavallo della mezzanotte', () => {
    expect(calcolaOreTurno('22:00:00', '06:00:00')).toBe(8)
  })
  it('ritorna 0 per un turno di riposo (orari uguali)', () => {
    expect(calcolaOreTurno('00:00:00', '00:00:00')).toBe(0)
  })
})

describe('isOrarioValido', () => {
  it('ritorna true per orari validi diversi', () => {
    expect(isOrarioValido('08:00:00', '16:00:00')).toBe(true)
  })
  it('ritorna true anche per orari uguali (turno riposo)', () => {
    expect(isOrarioValido('08:00:00', '08:00:00')).toBe(true)
  })
})

describe('statoTimbratura', () => {
  it('ritorna "non_iniziato" se non ci sono timbri', () => {
    expect(statoTimbratura({ ora_ingresso_effettiva: null, ora_uscita_effettiva: null }))
      .toBe('non_iniziato')
  })
  it('ritorna "in_corso" con solo ingresso', () => {
    expect(statoTimbratura({
      ora_ingresso_effettiva: '2026-04-23T08:52:00Z',
      ora_uscita_effettiva: null,
    })).toBe('in_corso')
  })
  it('ritorna "completato" con entrambi i timbri', () => {
    expect(statoTimbratura({
      ora_ingresso_effettiva: '2026-04-23T08:52:00Z',
      ora_uscita_effettiva: '2026-04-23T17:03:00Z',
    })).toBe('completato')
  })
  it('ritorna "non_iniziato" con solo uscita (stato invalido)', () => {
    expect(statoTimbratura({
      ora_ingresso_effettiva: null,
      ora_uscita_effettiva: '2026-04-23T17:03:00Z',
    })).toBe('non_iniziato')
  })
})
