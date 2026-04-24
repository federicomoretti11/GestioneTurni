import { describe, it, expect } from 'vitest'
import { presetPeriodo, type Periodo } from '@/lib/utils/periodi'

function d(s: string) { return new Date(s + 'T12:00:00') }

describe('presetPeriodo', () => {
  it('"settimana-corrente" ritorna lunedì-domenica', () => {
    // Mercoledì 22 aprile 2026
    const p: Periodo = presetPeriodo('settimana-corrente', d('2026-04-22'))
    expect(p.inizio).toBe('2026-04-20') // lunedì
    expect(p.fine).toBe('2026-04-26')   // domenica
  })

  it('"settimana-prossima"', () => {
    const p = presetPeriodo('settimana-prossima', d('2026-04-22'))
    expect(p.inizio).toBe('2026-04-27')
    expect(p.fine).toBe('2026-05-03')
  })

  it('"mese-corrente"', () => {
    const p = presetPeriodo('mese-corrente', d('2026-04-22'))
    expect(p.inizio).toBe('2026-04-01')
    expect(p.fine).toBe('2026-04-30')
  })

  it('"mese-prossimo"', () => {
    const p = presetPeriodo('mese-prossimo', d('2026-04-22'))
    expect(p.inizio).toBe('2026-05-01')
    expect(p.fine).toBe('2026-05-31')
  })
})
