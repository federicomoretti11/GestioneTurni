import { Festivo, TurnoConDettagli } from '@/lib/types'
import { formatDateIT, formatTimeShort } from './date'
import { calcolaOreDiurneNotturne, calcolaOreTurno } from './turni'
import { trovaFestivo } from './maggiorazioni'

// Indici di colonna — usati dal PDF per lo styling condizionale.
// Mantenere allineati con l'array `header` sotto.
const COL = {
  NOTTURNE: 8,
  ORE_FESTIVE: 9,
  TIPO: 10,
} as const

function formatOre(n: number): number | string {
  if (n === 0) return 0
  // xlsx preserva i numeri: manteniamo numeric per somme automatiche.
  return Math.round(n * 100) / 100
}

function classificaTipo(ore: number, notturne: number, oreFestive: number): string {
  if (ore === 0) return 'Riposo'
  const notturno = notturne > 0
  const festivo = oreFestive > 0
  if (notturno && festivo) return 'Notturno + Festivo'
  if (festivo) return 'Festivo'
  if (notturno) return 'Notturno'
  return ''
}

export function turniToExcelRows(
  turni: TurnoConDettagli[],
  festivi: Festivo[] = []
): (string | number)[][] {
  const header = [
    'Dipendente',
    'Data',
    'Giorno',
    'Posto di servizio',
    'Ora inizio',
    'Ora fine',
    'Ore',
    'Diurne',
    'Notturne (22-06)',
    'Ore festive',
    'Tipo',
    'Note',
  ]

  // Raggruppa per dipendente
  const perDipendente = new Map<string, TurnoConDettagli[]>()
  for (const t of turni) {
    const key = `${t.profile.cognome} ${t.profile.nome}`
    if (!perDipendente.has(key)) perDipendente.set(key, [])
    perDipendente.get(key)!.push(t)
  }

  const rows: (string | number)[][] = []
  const tot = { ore: 0, diurne: 0, notturne: 0, festive: 0 }

  for (const [nome, turniDip] of Array.from(perDipendente)) {
    const subtot = { ore: 0, diurne: 0, notturne: 0, festive: 0 }
    for (const t of turniDip) {
      const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
      const { diurne, notturne } = calcolaOreDiurneNotturne(t.ora_inizio, t.ora_fine)
      const festivo = trovaFestivo(t.data, festivi)
      const oreFestive = festivo ? ore : 0
      const tipo = classificaTipo(ore, notturne, oreFestive)

      subtot.ore += ore
      subtot.diurne += diurne
      subtot.notturne += notturne
      subtot.festive += oreFestive

      const giornoSettimana = new Date(`${t.data}T00:00:00`).toLocaleDateString('it-IT', { weekday: 'long' })

      rows.push([
        nome,
        formatDateIT(t.data),
        giornoSettimana.charAt(0).toUpperCase() + giornoSettimana.slice(1),
        t.posto?.nome ?? '',
        formatTimeShort(t.ora_inizio),
        formatTimeShort(t.ora_fine),
        formatOre(ore),
        formatOre(diurne),
        formatOre(notturne),
        oreFestive > 0 ? formatOre(oreFestive) : '',
        tipo,
        t.note ?? '',
      ])
    }
    tot.ore += subtot.ore
    tot.diurne += subtot.diurne
    tot.notturne += subtot.notturne
    tot.festive += subtot.festive

    rows.push([
      '',
      `SUBTOTALE ${nome.toUpperCase()}`,
      '',
      '',
      '',
      '',
      formatOre(subtot.ore),
      formatOre(subtot.diurne),
      formatOre(subtot.notturne),
      subtot.festive > 0 ? formatOre(subtot.festive) : '',
      '',
      '',
    ])
  }

  rows.push([
    '',
    'TOTALE GENERALE',
    '',
    '',
    '',
    '',
    formatOre(tot.ore),
    formatOre(tot.diurne),
    formatOre(tot.notturne),
    tot.festive > 0 ? formatOre(tot.festive) : '',
    '',
    '',
  ])

  return [header, ...rows]
}

export async function exportExcel(
  turni: TurnoConDettagli[],
  filename: string,
  festivi: Festivo[] = []
) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.aoa_to_sheet(turniToExcelRows(turni, festivi))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Turni')
  writeFile(wb, `${filename}.xlsx`)
}

export async function exportCsv(
  turni: TurnoConDettagli[],
  filename: string,
  festivi: Festivo[] = []
) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.aoa_to_sheet(turniToExcelRows(turni, festivi))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Turni')
  writeFile(wb, `${filename}.csv`, { bookType: 'csv' })
}

export async function exportPdf(
  turni: TurnoConDettagli[],
  filename: string,
  periodo: string,
  festivi: Festivo[] = []
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(`Piano Turni — ${periodo}`, 14, 15)

  // Legenda: quadratini colorati + testo (il carattere ■ non è nel charset
  // di Helvetica di jsPDF, renderizza come '%'. Li disegniamo noi.)
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(79, 70, 229)   // indigo-600
  doc.rect(14, 18, 3, 3, 'F')
  doc.text('Ore notturne (22-06)', 19, 20.5)
  doc.setFillColor(185, 28, 28)   // red-700
  doc.rect(65, 18, 3, 3, 'F')
  doc.text('Giorno festivo', 70, 20.5)

  const rows = turniToExcelRows(turni, festivi)
  autoTable(doc, {
    head: [rows[0] as string[]],
    body: rows.slice(1) as string[][],
    startY: 24,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const raw = data.row.raw as (string | number)[]
      const label = typeof raw[1] === 'string' ? (raw[1] as string) : ''
      const isSubtotale = label.startsWith('SUBTOTALE')
      const isTotale = label === 'TOTALE GENERALE'

      // Una riga è "festiva" se ha un numero in "Ore festive" — evita dipendere
      // da colonne rimosse e funziona solo sulle righe dati.
      const isFestivo = typeof raw[COL.ORE_FESTIVE] === 'number' && (raw[COL.ORE_FESTIVE] as number) > 0

      if (isSubtotale) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [71, 85, 105]     // slate-600
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.lineWidth = 0.1
        data.cell.styles.lineColor = [30, 41, 59]
        return
      }
      if (isTotale) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [30, 58, 138]     // blue-900
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.lineWidth = 0.1
        data.cell.styles.lineColor = [15, 23, 42]
        return
      }

      // Sfondo rosato per tutta la riga se giorno festivo.
      if (isFestivo) {
        data.cell.styles.fillColor = [254, 226, 226] // red-100
      }

      // Colora in indaco+bold le ore notturne > 0
      if (data.column.index === COL.NOTTURNE) {
        const v = data.cell.raw
        if (typeof v === 'number' && v > 0) {
          data.cell.styles.textColor = [79, 70, 229] // indigo-600
          data.cell.styles.fontStyle = 'bold'
        }
      }

      // Colora in rosso+bold le ore festive
      if (data.column.index === COL.ORE_FESTIVE) {
        const v = data.cell.raw
        if (typeof v === 'number' && v > 0) {
          data.cell.styles.textColor = [185, 28, 28] // red-700
          data.cell.styles.fontStyle = 'bold'
        }
      }

      // Tipo: colore coerente con le altre evidenziazioni
      if (data.column.index === COL.TIPO) {
        const tipo = String(data.cell.raw ?? '')
        if (tipo.includes('Festivo') && tipo.includes('Notturno')) {
          data.cell.styles.textColor = [124, 58, 237] // viola
          data.cell.styles.fontStyle = 'bold'
        } else if (tipo === 'Festivo') {
          data.cell.styles.textColor = [185, 28, 28]
          data.cell.styles.fontStyle = 'bold'
        } else if (tipo === 'Notturno') {
          data.cell.styles.textColor = [79, 70, 229]
          data.cell.styles.fontStyle = 'bold'
        } else if (tipo === 'Riposo') {
          data.cell.styles.textColor = [100, 116, 139] // slate-500
        }
      }
    },
  })
  doc.save(`${filename}.pdf`)
}
