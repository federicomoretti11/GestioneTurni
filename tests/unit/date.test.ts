import { describe, it, expect } from 'vitest'
import {
  getWeekDays,
  getMonthDays,
  formatDateIT,
  formatTimeShort,
} from '@/lib/utils/date'

describe('getWeekDays', () => {
  it('restituisce 7 giorni a partire dal lunedì della settimana data', () => {
    const days = getWeekDays(new Date('2026-04-20'))
    expect(days).toHaveLength(7)
    expect(days[0].toISOString().slice(0, 10)).toBe('2026-04-20')
    expect(days[6].toISOString().slice(0, 10)).toBe('2026-04-26')
  })
})

describe('getMonthDays', () => {
  it('restituisce tutti i giorni del mese specificato', () => {
    const days = getMonthDays(2026, 3) // aprile (0-indexed)
    expect(days).toHaveLength(30)
    expect(days[0].toISOString().slice(0, 10)).toBe('2026-04-01')
    expect(days[29].toISOString().slice(0, 10)).toBe('2026-04-30')
  })
})

describe('formatDateIT', () => {
  it('formatta la data in italiano', () => {
    expect(formatDateIT('2026-04-20')).toBe('20/04/2026')
  })
})

describe('formatTimeShort', () => {
  it("rimuove i secondi dall'orario", () => {
    expect(formatTimeShort('08:00:00')).toBe('08:00')
    expect(formatTimeShort('14:30:00')).toBe('14:30')
  })
})
