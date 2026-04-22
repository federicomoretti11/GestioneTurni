// Festivi nazionali italiani.
// Step 1: funzioni pure di calcolo. In step 2 verranno esposti via DB per
// permettere all'admin di aggiungere festivi patronali.

interface Festivo {
  data: string     // YYYY-MM-DD
  nome: string
}

// Festivi fissi nazionali (MM-DD)
const FESTIVI_FISSI: Array<{ md: string; nome: string }> = [
  { md: '01-01', nome: 'Capodanno' },
  { md: '01-06', nome: 'Epifania' },
  { md: '04-25', nome: 'Festa della Liberazione' },
  { md: '05-01', nome: 'Festa del Lavoro' },
  { md: '06-02', nome: 'Festa della Repubblica' },
  { md: '08-15', nome: 'Ferragosto' },
  { md: '11-01', nome: 'Ognissanti' },
  { md: '12-08', nome: 'Immacolata Concezione' },
  { md: '12-25', nome: 'Natale' },
  { md: '12-26', nome: 'Santo Stefano' },
]

// Algoritmo Anonimo Gregoriano per calcolare la Pasqua
function calcolaPasqua(anno: number): Date {
  const a = anno % 19
  const b = Math.floor(anno / 100)
  const c = anno % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mese = Math.floor((h + l - 7 * m + 114) / 31)
  const giorno = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anno, mese - 1, giorno)
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

export function getFestiviAnno(anno: number): Festivo[] {
  const fissi: Festivo[] = FESTIVI_FISSI.map(f => ({
    data: `${anno}-${f.md}`,
    nome: f.nome,
  }))
  const pasqua = calcolaPasqua(anno)
  const pasquetta = new Date(pasqua)
  pasquetta.setDate(pasqua.getDate() + 1)
  return [
    ...fissi,
    { data: toDateStr(pasqua), nome: 'Pasqua' },
    { data: toDateStr(pasquetta), nome: "Lunedì dell'Angelo" },
  ].sort((a, b) => a.data.localeCompare(b.data))
}

// Set pre-calcolato per anno corrente ± 2 — usato come fallback finché
// lo step 2 non introduce la tabella DB.
const CACHE = new Map<number, Set<string>>()
function getSetAnno(anno: number): Set<string> {
  let s = CACHE.get(anno)
  if (!s) {
    s = new Set(getFestiviAnno(anno).map(f => f.data))
    CACHE.set(anno, s)
  }
  return s
}

export function isFestivoNazionale(data: string): boolean {
  const anno = Number(data.slice(0, 4))
  if (!Number.isFinite(anno)) return false
  return getSetAnno(anno).has(data)
}
