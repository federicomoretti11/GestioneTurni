export type RuoloUtente = 'admin' | 'manager' | 'dipendente'

export interface Profile {
  id: string
  nome: string
  cognome: string
  ruolo: RuoloUtente
  reparto_id: string | null
  attivo: boolean
  created_at: string
}

export interface Reparto {
  id: string
  nome: string
  manager_id: string | null
  created_at: string
}

export interface TurnoTemplate {
  id: string
  nome: string
  ora_inizio: string  // "HH:MM:SS"
  ora_fine: string    // "HH:MM:SS"
  colore: string      // hex
  created_at: string
}

export interface Turno {
  id: string
  dipendente_id: string
  template_id: string | null
  data: string        // "YYYY-MM-DD"
  ora_inizio: string  // "HH:MM:SS"
  ora_fine: string    // "HH:MM:SS"
  note: string | null
  creato_da: string
  created_at: string
  updated_at: string
  // join opzionali
  profile?: Profile
  template?: TurnoTemplate
}

export interface TurnoConDettagli extends Turno {
  profile: Profile
  template: TurnoTemplate | null
}
