export type RuoloUtente = 'admin' | 'manager' | 'dipendente'

export interface Profile {
  id: string
  nome: string
  cognome: string
  ruolo: RuoloUtente
  attivo: boolean
  includi_in_turni: boolean
  created_at: string
}

export interface PostoDiServizio {
  id: string
  nome: string
  descrizione: string | null
  attivo: boolean
  created_at: string
  latitudine: number | null
  longitudine: number | null
  raggio_metri: number
  geo_check_abilitato: boolean
}

export interface TurnoTemplate {
  id: string
  nome: string
  ora_inizio: string  // "HH:MM:SS"
  ora_fine: string    // "HH:MM:SS"
  colore: string      // hex
  categoria: CategoriaTemplate
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
  lat_checkin: number | null
  lng_checkin: number | null
  geo_anomalia: boolean
  sblocco_checkin_valido_fino: string | null
  sblocco_usato_at: string | null
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
  | 'richiesta_creata'
  | 'richiesta_approvata_manager'
  | 'richiesta_approvata'
  | 'richiesta_rifiutata'
  | 'richiesta_cancellata'
  | 'malattia_comunicata'
  | 'sblocco_approvato'
  | 'menzione_task'
  | 'task_assegnato'
  | 'cedolino_disponibile'

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

export type TipoRichiesta = 'ferie' | 'permesso' | 'malattia' | 'cambio_turno' | 'sblocco_checkin'
export type StatoRichiesta = 'pending' | 'approvata_manager' | 'approvata' | 'rifiutata' | 'annullata' | 'comunicata'
export type PermessoTipo = 'giornata' | 'mezza_mattina' | 'mezza_pomeriggio' | 'ore'
export type CategoriaTemplate = 'lavoro' | 'ferie' | 'permesso' | 'malattia'
export type AzioneRichiesta = 'cancella' | 'approva' | 'rifiuta' | 'convalida'

export interface Richiesta {
  id: string
  dipendente_id: string
  tipo: TipoRichiesta
  data_inizio: string        // "YYYY-MM-DD"
  data_fine: string | null
  permesso_tipo: PermessoTipo | null
  ora_inizio: string | null  // "HH:MM:SS"
  ora_fine: string | null
  turno_id: string | null
  stato: StatoRichiesta
  note_dipendente: string | null
  motivazione_decisione: string | null
  manager_id: string | null
  manager_decisione_at: string | null
  admin_id: string | null
  admin_decisione_at: string | null
  created_at: string
  updated_at: string
  // join opzionali
  profile?: Profile
  turno?: Turno | null
}

export interface ImpostazioniTenant {
  gps_checkin_abilitato: boolean
  email_notifiche_abilitato: boolean
  modulo_cedolini_abilitato: boolean
  modulo_analytics_abilitato: boolean
  modulo_tasks_abilitato: boolean
  modulo_documenti_abilitato: boolean
  modulo_paghe_abilitato: boolean
  modulo_ai_copilot_abilitato: boolean
  white_label_abilitato: boolean
  // Moduli HR avanzati
  modulo_contratti_abilitato: boolean
  modulo_straordinari_abilitato: boolean
  modulo_ferie_contatori_abilitato: boolean
  modulo_staffing_abilitato: boolean
  modulo_indisponibilita_abilitato: boolean
  // Ruoli che possono vedere ogni modulo (default: tutti e tre)
  modulo_tasks_ruoli: string[]
  modulo_documenti_ruoli: string[]
  modulo_cedolini_ruoli: string[]
  modulo_analytics_ruoli: string[]
  modulo_paghe_ruoli: string[]
  modulo_ai_copilot_ruoli: string[]
}

export interface Cedolino {
  id: string
  tenant_id: string
  dipendente_id: string
  nome: string
  mese: string            // "YYYY-MM-DD" (primo giorno del mese)
  storage_path: string
  dimensione_bytes: number
  created_at: string
  created_by: string | null
  profile?: { nome: string; cognome: string } | null
}

export type PianoTenant = 'starter' | 'professional' | 'enterprise'

export interface TenantConPiano {
  id: string
  nome: string
  slug: string
  attivo: boolean
  piano: PianoTenant
  piano_scadenza: string | null
  piano_note: string | null
  created_at: string
}

export interface TenantDettaglio extends TenantConPiano {
  impostazioni: ImpostazioniTenant
  utenti_count: number
  piano_log: TenantPianoLog[]
  nome_app: string | null
  colore_primario: string | null
  logo_url: string | null
}

export interface TenantPianoLog {
  id: string
  tenant_id: string
  piano: PianoTenant
  cambiato_da: string | null
  note: string | null
  created_at: string
}

export type TipoContratto = 'full_time' | 'part_time' | 'turni_fissi' | 'turni_rotanti'

export interface ContrattoDipendente {
  id: string
  tenant_id: string
  dipendente_id: string
  tipo: TipoContratto
  ore_settimanali: number
  ore_giornaliere: number
  data_inizio: string   // "YYYY-MM-DD"
  created_at: string
  updated_at: string
}

export interface ContatoreFerie {
  id: string
  tenant_id: string
  dipendente_id: string
  anno: number
  ferie_giorni: number
  permesso_ore: number
  rol_ore: number
  created_at: string
  updated_at: string
}

export interface ContatoreFerieSaldo extends ContatoreFerie {
  ferie_usate: number
  permesso_usate: number
  rol_usate: number
}

export interface Indisponibilita {
  id: string
  tenant_id: string
  dipendente_id: string
  data_inizio: string
  data_fine: string
  motivo: string | null
  created_at: string
}
