import type { Festivo } from '@/lib/types'
import { calcolaOreDiurneNotturne } from './turni'

export interface ClassificazioneOre {
  ore: number
  diurne: number
  notturne: number
  festivo: Festivo | null
  // Note: la domenica non comporta maggiorazione per questa app (decisione utente),
  // quindi non la evidenziamo. Solo le ore notturne (22–06) e i festivi (nazionali/patronali/custom)
  // sono rilevanti per il conteggio maggiorato.
}

export function trovaFestivo(data: string, festivi: Festivo[]): Festivo | null {
  return festivi.find(f => f.data === data) ?? null
}

export function classificaOre(
  data: string,
  oraInizio: string,
  oraFine: string,
  festivi: Festivo[]
): ClassificazioneOre {
  const { diurne, notturne } = calcolaOreDiurneNotturne(oraInizio, oraFine)
  return {
    ore: diurne + notturne,
    diurne,
    notturne,
    festivo: trovaFestivo(data, festivi),
  }
}

// Helper di formattazione per le label ore.
export function formatOre(n: number): string {
  if (n === 0) return '0h'
  return n % 1 === 0 ? `${n}h` : `${n.toFixed(1)}h`
}
