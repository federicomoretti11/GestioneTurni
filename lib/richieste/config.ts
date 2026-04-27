// lib/richieste/config.ts
import type { TipoRichiesta, StatoRichiesta, AzioneRichiesta } from '@/lib/types'

export const LEAD_TIMES_MS: Record<TipoRichiesta, number> = {
  ferie:        7 * 24 * 60 * 60 * 1000,
  permesso:         24 * 60 * 60 * 1000,
  cambio_turno: 2 * 24 * 60 * 60 * 1000,
  malattia:                            0,
}

export const LEAD_TIME_LABEL: Record<TipoRichiesta, string> = {
  ferie:        '7 giorni',
  permesso:     '24 ore',
  cambio_turno: '48 ore',
  malattia:     '',
}

export const TRANSIZIONI_VALIDE: Array<{
  da: StatoRichiesta
  a: StatoRichiesta
  ruoli: Array<'dipendente' | 'manager' | 'admin'>
  azione: AzioneRichiesta
}> = [
  { da: 'pending',           a: 'annullata',          ruoli: ['dipendente'],          azione: 'cancella'  },
  { da: 'pending',           a: 'approvata_manager',  ruoli: ['manager', 'admin'],    azione: 'approva'   },
  { da: 'pending',           a: 'approvata',          ruoli: ['admin'],               azione: 'approva'   },
  { da: 'approvata_manager', a: 'approvata',          ruoli: ['admin'],               azione: 'convalida' },
  { da: 'pending',           a: 'rifiutata',          ruoli: ['manager', 'admin'],    azione: 'rifiuta'   },
  { da: 'approvata_manager', a: 'rifiutata',          ruoli: ['manager', 'admin'],    azione: 'rifiuta'   },
]
