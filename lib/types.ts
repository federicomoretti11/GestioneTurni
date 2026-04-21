export type RuoloUtente = 'admin' | 'manager' | 'dipendente'

export interface Profile {
  id: string
  nome: string
  cognome: string
  ruolo: RuoloUtente
  attivo: boolean
  created_at: string
}

export interface PostoDiServizio {
  id: string
  nome: string
  descrizione: string | null
  attivo: boolean
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
  posto_id: string | null
  note: string | null
  creato_da: string
  created_at: string
  updated_at: string
  // join opzionali
  profile?: Profile
  template?: TurnoTemplate | null | undefined
  posto?: PostoDiServizio | null
}

export interface TurnoConDettagli extends Turno {
  profile: Profile
  template: TurnoTemplate | null
  posto: PostoDiServizio | null
}
