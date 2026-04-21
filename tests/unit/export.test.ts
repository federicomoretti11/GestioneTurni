import { describe, it, expect } from 'vitest'
import { turniToExcelRows } from '@/lib/utils/export'
import type { TurnoConDettagli } from '@/lib/types'

describe('turniToExcelRows', () => {
  it('converte un array di turni in righe Excel con ore e totali', () => {
    const turni = [{
      id: '1',
      dipendente_id: 'u1',
      data: '2026-04-20',
      ora_inizio: '08:00:00',
      ora_fine: '16:00:00',
      note: 'test',
      profile: { id: 'u1', nome: 'Mario', cognome: 'Rossi', ruolo: 'dipendente', attivo: true, created_at: '' },
      template: null,
      posto: { id: 'p1', nome: 'Ingresso', descrizione: null, attivo: true, created_at: '' },
      posto_id: 'p1', template_id: null, creato_da: '', created_at: '', updated_at: '',
    }] as TurnoConDettagli[]

    const rows = turniToExcelRows(turni)
    expect(rows).toHaveLength(4) // header + riga + subtotale + totale generale
    expect(rows[0]).toEqual(['Dipendente', 'Data', 'Posto di servizio', 'Ora inizio', 'Ora fine', 'Ore', 'Note'])
    expect(rows[1]).toEqual(['Rossi Mario', '20/04/2026', 'Ingresso', '08:00', '16:00', 8, 'test'])
    expect(rows[2][1]).toBe('Subtotale Rossi Mario')
    expect(rows[2][5]).toBe(8)
    expect(rows[3][1]).toBe('TOTALE GENERALE')
    expect(rows[3][5]).toBe(8)
  })
})
