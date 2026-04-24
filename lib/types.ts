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

export type StatoTurno = 'bozza' | 'confermato'

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
  ora_ingresso_effettiva: string | null  // ISO timestamptz
  ora_uscita_effettiva: string | null    // ISO timestamptz
  stato: StatoTurno
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

export type TipoNotifica =
  | 'turno_assegnato'
  | 'turno_modificato'
  | 'turno_eliminato'
  | 'settimana_pianificata'
  | 'check_in'
  | 'check_out'
  | 'turni_pubblicati'

export interface Notifica {
  id: string
  destinatario_id: string
  tipo: TipoNotifica
  titolo: string
  messaggio: string
  turno_id: string | null
  data_turno: string | null
  letta: boolean
  created_at: string
}

export type TipoFestivo = 'nazionale' | 'patronale' | 'custom'

export interface Festivo {
  data: string      // YYYY-MM-DD
  nome: string
  tipo: TipoFestivo
  created_at: string
}
