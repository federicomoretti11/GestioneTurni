import { describe, it, expect } from 'vitest'
import { turniToExcelRows } from '@/lib/utils/export'
import type { Festivo, TurnoConDettagli } from '@/lib/types'

const BASE_PROFILE = { id: 'u1', nome: 'Mario', cognome: 'Rossi', ruolo: 'dipendente' as const, attivo: true, created_at: '' }
const BASE_POSTO = { id: 'p1', nome: 'Ingresso', descrizione: null, attivo: true, created_at: '' }
const BASE_TURNO = {
  id: '1', dipendente_id: 'u1', note: null, template: null,
  posto_id: 'p1', template_id: null, creato_da: '', created_at: '', updated_at: '',
  profile: BASE_PROFILE, posto: BASE_POSTO,
}

function makeTurno(data: string, ora_inizio: string, ora_fine: string): TurnoConDettagli {
  return { ...BASE_TURNO, data, ora_inizio, ora_fine } as TurnoConDettagli
}

function makeFestivo(data: string): Festivo {
  return { id: 'f1', data, nome: 'Festivo', tipo: 'nazionale', created_at: '' } as unknown as Festivo
}

describe('turniToExcelRows', () => {
  // Colonne: Dipendente, Data, Giorno, Posto, Inizio, Fine, Ore, Diurne, Notturne, Festive, Tipo, Note
  const COL = { ORE: 6, DIURNE: 7, NOTTURNE: 8, FESTIVE: 9 }

  it('struttura header e conteggio righe', () => {
    const rows = turniToExcelRows([makeTurno('2026-04-20', '08:00:00', '16:00:00')])
    expect(rows).toHaveLength(4) // header + riga + subtotale + totale
    expect(rows[0][0]).toBe('Dipendente')
    expect(rows[0][COL.ORE]).toBe('Ore')
    expect(rows[0][COL.DIURNE]).toBe('Diurne')
    expect(rows[0][COL.NOTTURNE]).toBe('Notturne (22-06)')
    expect(rows[0][COL.FESTIVE]).toBe('Ore festive')
  })

  it('turno diurno normale: diurne = ore, notturne = 0, festive = 0', () => {
    const rows = turniToExcelRows([makeTurno('2026-04-20', '08:00:00', '16:00:00')])
    const riga = rows[1]
    expect(riga[COL.ORE]).toBe(8)
    expect(riga[COL.DIURNE]).toBe(8)
    expect(riga[COL.NOTTURNE]).toBe(0)
    expect(riga[COL.FESTIVE]).toBe('')  // celle festive vuote quando 0
  })

  it('turno notturno normale: diurne + notturne = ore, festive = 0', () => {
    // 22:00-06:00 = 8h tutte notturne
    const rows = turniToExcelRows([makeTurno('2026-04-20', '22:00:00', '06:00:00')])
    const riga = rows[1]
    expect(riga[COL.ORE]).toBe(8)
    expect(riga[COL.DIURNE]).toBe(0)
    expect(riga[COL.NOTTURNE]).toBe(8)
    expect(riga[COL.FESTIVE]).toBe('')
  })

  it('turno diurno festivo: festive = ore, diurne = 0, notturne = 0', () => {
    const festivi = [makeFestivo('2026-04-25')]
    const rows = turniToExcelRows([makeTurno('2026-04-25', '08:00:00', '16:00:00')], festivi)
    const riga = rows[1]
    expect(riga[COL.ORE]).toBe(8)
    expect(riga[COL.DIURNE]).toBe(0)
    expect(riga[COL.NOTTURNE]).toBe(0)
    expect(riga[COL.FESTIVE]).toBe(8)
  })

  it('turno 20-06 festivo: 4h festive (20-00) + 6h notturne (00-06)', () => {
    const festivi = [makeFestivo('2026-04-25')]
    const rows = turniToExcelRows([makeTurno('2026-04-25', '20:00:00', '06:00:00')], festivi)
    const riga = rows[1]
    expect(riga[COL.ORE]).toBe(10)
    expect(riga[COL.DIURNE]).toBe(0)
    expect(riga[COL.NOTTURNE]).toBe(6)
    expect(riga[COL.FESTIVE]).toBe(4)
    // invariante: diurne + notturne + festive = ore
    expect((riga[COL.DIURNE] as number) + (riga[COL.NOTTURNE] as number) + (riga[COL.FESTIVE] as number)).toBe(riga[COL.ORE])
  })

  it('turno 22-06 festivo: 2h festive (22-00) + 6h notturne (00-06)', () => {
    const festivi = [makeFestivo('2026-04-25')]
    const rows = turniToExcelRows([makeTurno('2026-04-25', '22:00:00', '06:00:00')], festivi)
    const riga = rows[1]
    expect(riga[COL.ORE]).toBe(8)
    expect(riga[COL.DIURNE]).toBe(0)
    expect(riga[COL.NOTTURNE]).toBe(6)
    expect(riga[COL.FESTIVE]).toBe(2)
  })

  it('invariante diurne + notturne + festive = ore su tutti i turni', () => {
    const festivi = [makeFestivo('2026-04-25')]
    const turni = [
      makeTurno('2026-04-20', '08:00:00', '16:00:00'),
      makeTurno('2026-04-21', '22:00:00', '06:00:00'),
      makeTurno('2026-04-25', '08:00:00', '16:00:00'),
      makeTurno('2026-04-25', '20:00:00', '06:00:00'),
    ]
    const rows = turniToExcelRows(turni, festivi)
    const righe = rows.slice(1).filter(r => r[0] !== '')  // solo righe dati, no subtot/totale
    for (const r of righe) {
      const ore = r[COL.ORE] as number
      const d = r[COL.DIURNE] as number
      const n = r[COL.NOTTURNE] as number
      const f = typeof r[COL.FESTIVE] === 'number' ? r[COL.FESTIVE] as number : 0
      expect(Math.round((d + n + f) * 100)).toBe(Math.round(ore * 100))
    }
  })
})
