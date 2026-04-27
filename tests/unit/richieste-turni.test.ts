import { describe, it, expect } from 'vitest'
import { dateRange } from '@/lib/richieste/turni'

describe('dateRange', () => {
  it('una sola data', () => {
    expect(dateRange('2026-05-12', '2026-05-12')).toEqual(['2026-05-12'])
  })
  it('range di 3 giorni', () => {
    expect(dateRange('2026-05-12', '2026-05-14')).toEqual(['2026-05-12', '2026-05-13', '2026-05-14'])
  })
  it('fine < inizio ritorna array vuoto', () => {
    expect(dateRange('2026-05-14', '2026-05-12')).toEqual([])
  })
})
