export type PresetPeriodo = 'settimana-corrente' | 'settimana-prossima' | 'mese-corrente' | 'mese-prossimo'

export interface Periodo {
  inizio: string // YYYY-MM-DD
  fine: string   // YYYY-MM-DD
}

// Formatta una Date nel fuso orario locale (evita lo shift UTC che
// sballerebbe il giorno quando la mezzanotte locale è già il giorno prima in UTC).
function toDateStringLocale(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

function lunediDellaSettimana(d: Date): Date {
  const r = new Date(d)
  const g = r.getDay() // 0=dom, 1=lun...
  const diff = g === 0 ? -6 : 1 - g
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

export function presetPeriodo(preset: PresetPeriodo, oggi: Date = new Date()): Periodo {
  if (preset === 'settimana-corrente') {
    const lun = lunediDellaSettimana(oggi)
    const dom = new Date(lun)
    dom.setDate(dom.getDate() + 6)
    return { inizio: toDateStringLocale(lun), fine: toDateStringLocale(dom) }
  }
  if (preset === 'settimana-prossima') {
    const lun = lunediDellaSettimana(oggi)
    lun.setDate(lun.getDate() + 7)
    const dom = new Date(lun)
    dom.setDate(dom.getDate() + 6)
    return { inizio: toDateStringLocale(lun), fine: toDateStringLocale(dom) }
  }
  if (preset === 'mese-corrente') {
    const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
    const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)
    return { inizio: toDateStringLocale(inizio), fine: toDateStringLocale(fine) }
  }
  // mese-prossimo
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 1)
  const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 2, 0)
  return { inizio: toDateStringLocale(inizio), fine: toDateStringLocale(fine) }
}
