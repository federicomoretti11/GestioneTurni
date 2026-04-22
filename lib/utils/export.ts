import { Festivo, TurnoConDettagli } from '@/lib/types'
import { formatDateIT, formatTimeShort } from './date'
import { calcolaOreDiurneNotturne, calcolaOreTurno } from './turni'
import { trovaFestivo } from './maggiorazioni'

// Indici di colonna — usati dal PDF per lo styling condizionale.
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

function dataCompatta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`
}

function giornoBreve(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '').toUpperCase().slice(0, 3)
}

interface OpzioniRows {
  compact?: boolean
}

export function turniToExcelRows(
  turni: TurnoConDettagli[],
  festivi: Festivo[] = [],
  opzioni: OpzioniRows = {}
): (string | number)[][] {
  const compact = opzioni.compact === true
  const header = [
    'Dipendente',
    'Data',
    'Giorno',
    compact ? 'Posto' : 'Posto di servizio',
    compact ? 'Inizio' : 'Ora inizio',
    compact ? 'Fine' : 'Ora fine',
    'Ore',
    'Diurne',
    compact ? 'Notturne' : 'Notturne (22-06)',
    compact ? 'Festive' : 'Ore festive',
    'Tipo',
    'Note',
  ]

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

      const giornoLungo = new Date(`${t.data}T00:00:00`).toLocaleDateString('it-IT', { weekday: 'long' })
      const giornoLabel = compact ? giornoBreve(t.data) : giornoLungo.charAt(0).toUpperCase() + giornoLungo.slice(1)

      rows.push([
        nome,
        compact ? dataCompatta(t.data) : formatDateIT(t.data),
        giornoLabel,
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
      compact ? `SUBTOT. ${nome.toUpperCase()}` : `SUBTOTALE ${nome.toUpperCase()}`,
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

interface RiepilogoDip {
  nome: string
  turni: number
  ore: number
  diurne: number
  notturne: number
  festive: number
}

function calcolaRiepilogoDipendenti(
  turni: TurnoConDettagli[],
  festivi: Festivo[]
): { righe: RiepilogoDip[]; totale: Omit<RiepilogoDip, 'nome'> } {
  const map = new Map<string, RiepilogoDip>()
  for (const t of turni) {
    const key = `${t.profile.cognome} ${t.profile.nome}`
    const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
    const { diurne, notturne } = calcolaOreDiurneNotturne(t.ora_inizio, t.ora_fine)
    const oreFestive = trovaFestivo(t.data, festivi) ? ore : 0
    if (!map.has(key)) map.set(key, { nome: key, turni: 0, ore: 0, diurne: 0, notturne: 0, festive: 0 })
    const r = map.get(key)!
    r.turni += 1
    r.ore += ore
    r.diurne += diurne
    r.notturne += notturne
    r.festive += oreFestive
  }
  const righe = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  const totale = righe.reduce(
    (s, r) => ({
      turni: s.turni + r.turni,
      ore: s.ore + r.ore,
      diurne: s.diurne + r.diurne,
      notturne: s.notturne + r.notturne,
      festive: s.festive + r.festive,
    }),
    { turni: 0, ore: 0, diurne: 0, notturne: 0, festive: 0 }
  )
  return { righe, totale }
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

interface OpzioniPdf {
  soloRiepilogo?: boolean
}

// Disegna l'intestazione comune (titolo + legenda) e ritorna la Y sotto la legenda.
function renderIntestazione(doc: any, periodo: string, titoloExtra = ''): number {
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  const titolo = titoloExtra
    ? `${titoloExtra} — ${periodo}`
    : `Piano Turni — ${periodo}`
  doc.text(titolo, 10, 12)

  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  doc.setFillColor(99, 102, 241)
  doc.rect(10, 14.5, 2.5, 2.5, 'F')
  doc.text('Notturne (22-06)', 14, 16.5)
  doc.setFillColor(225, 29, 72)
  doc.rect(50, 14.5, 2.5, 2.5, 'F')
  doc.text('Festivi', 54, 16.5)
  return 19
}

// Disegna la tabella riepilogo (riusata sia come pagina finale che come unica pagina).
function renderRiepilogo(
  doc: any,
  autoTable: any,
  turni: TurnoConDettagli[],
  festivi: Festivo[],
  startY: number,
  fontSize: number
) {
  const { righe, totale } = calcolaRiepilogoDipendenti(turni, festivi)
  if (righe.length === 0) return

  const head = ['Dipendente', 'Turni', 'Ore totali', 'Diurne', 'Notturne', 'Festive']
  const body: (string | number)[][] = righe.map(r => [
    r.nome,
    r.turni,
    formatOre(r.ore),
    formatOre(r.diurne),
    formatOre(r.notturne),
    r.festive > 0 ? formatOre(r.festive) : '',
  ])
  body.push([
    'TOTALE',
    totale.turni,
    formatOre(totale.ore),
    formatOre(totale.diurne),
    formatOre(totale.notturne),
    totale.festive > 0 ? formatOre(totale.festive) : '',
  ])

  // Larghezze sommate a 277 mm = A4 landscape (297) - margini (10+10).
  // La tabella occupa così tutta la larghezza utile senza buchi a destra.
  autoTable(doc, {
    head: [head],
    body,
    startY,
    margin: { left: 10, right: 10 },
    tableWidth: 277,
    styles: { fontSize, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 85 },                      // Dipendente
      1: { cellWidth: 26, halign: 'right' },     // Turni
      2: { cellWidth: 40, halign: 'right' },     // Ore totali
      3: { cellWidth: 40, halign: 'right' },     // Diurne
      4: { cellWidth: 44, halign: 'right' },     // Notturne
      5: { cellWidth: 42, halign: 'right' },     // Festive
    },
    didParseCell: (data: any) => {
      if (data.section !== 'body') return
      const raw = data.row.raw as (string | number)[]
      const isTotale = raw[0] === 'TOTALE'
      if (isTotale) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [219, 234, 254]
        data.cell.styles.textColor = [30, 58, 138]
        return
      }
      if (data.column.index === 4) {
        const v = data.cell.raw
        if (typeof v === 'number' && v > 0) {
          data.cell.styles.textColor = [99, 102, 241]
          data.cell.styles.fontStyle = 'bold'
        }
      }
      if (data.column.index === 5) {
        const v = data.cell.raw
        if (typeof v === 'number' && v > 0) {
          data.cell.styles.textColor = [225, 29, 72]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })
}

export async function exportPdf(
  turni: TurnoConDettagli[],
  filename: string,
  periodo: string,
  festivi: Festivo[] = [],
  opzioni: OpzioniPdf = {}
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })

  if (opzioni.soloRiepilogo) {
    const startY = renderIntestazione(doc, periodo, 'Riepilogo ore')
    renderRiepilogo(doc, autoTable, turni, festivi, startY, 11)
  } else {
    const startY = renderIntestazione(doc, periodo)

    // Tabella dettaglio turni
    const rows = turniToExcelRows(turni, festivi, { compact: true })
    const head = rows[0] as string[]
    const rawBody = rows.slice(1) as (string | number)[][]

    // Trasforma subtotali e totale in righe con colSpan: la label unisce
    // Dipendente→Fine (6 colonne) allineata a destra; le ore restano nelle
    // loro colonne; Tipo+Note uniti vuoti. Risultato: subtotali molto più
    // leggibili e con lo stesso stile forte del totale generale.
    const stileAggregato = {
      fillColor: [219, 234, 254] as [number, number, number],
      textColor: [30, 58, 138] as [number, number, number],
      fontStyle: 'bold' as const,
    }
    type CellDef = string | number | { content: string | number; colSpan?: number; styles?: any }
    const body: CellDef[][] = rawBody.map(row => {
      const label = typeof row[1] === 'string' ? row[1] : ''
      const isSubtotale = label.startsWith('SUBTOT')
      const isTotale = label === 'TOTALE GENERALE'
      if (isSubtotale || isTotale) {
        return [
          { content: label, colSpan: 6, styles: { ...stileAggregato, halign: 'right' } },
          { content: row[6], styles: { ...stileAggregato, halign: 'right' } },
          { content: row[7], styles: { ...stileAggregato, halign: 'right' } },
          { content: row[8], styles: { ...stileAggregato, halign: 'right' } },
          { content: row[9], styles: { ...stileAggregato, halign: 'right' } },
          { content: '', colSpan: 2, styles: stileAggregato },
        ]
      }
      return row as CellDef[]
    })

    autoTable(doc, {
      head: [head],
      body: body as any,
      startY,
      margin: { left: 10, right: 10 },
      tableWidth: 277,
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [226, 232, 240], lineWidth: 0.1, overflow: 'ellipsize' },
      headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 42 },                   // Dipendente
        1: { cellWidth: 15, halign: 'center' }, // Data
        2: { cellWidth: 12, halign: 'center' }, // Giorno
        3: { cellWidth: 48 },                   // Posto (ellipsize)
        4: { cellWidth: 13, halign: 'center' }, // Inizio
        5: { cellWidth: 13, halign: 'center' }, // Fine
        6: { cellWidth: 13, halign: 'right' },  // Ore
        7: { cellWidth: 14, halign: 'right' },  // Diurne
        8: { cellWidth: 16, halign: 'right' },  // Notturne
        9: { cellWidth: 14, halign: 'right' },  // Festive
        10: { cellWidth: 35 },                  // Tipo
        11: { cellWidth: 32 },                  // Note (ellipsize)
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return
        const raw = data.row.raw as (string | number)[]
        // Le righe aggregate hanno già styling inline via colSpan — skip.
        const label = typeof raw[1] === 'string' ? (raw[1] as string) : ''
        if (label.startsWith('SUBTOT') || label === 'TOTALE GENERALE') return

        const isFestivo = typeof raw[COL.ORE_FESTIVE] === 'number' && (raw[COL.ORE_FESTIVE] as number) > 0
        if (isFestivo) {
          data.cell.styles.fillColor = [255, 241, 242]
        }
        if (data.column.index === COL.NOTTURNE) {
          const v = data.cell.raw
          if (typeof v === 'number' && v > 0) {
            data.cell.styles.textColor = [99, 102, 241]
            data.cell.styles.fontStyle = 'bold'
          }
        }
        if (data.column.index === COL.ORE_FESTIVE) {
          const v = data.cell.raw
          if (typeof v === 'number' && v > 0) {
            data.cell.styles.textColor = [225, 29, 72]
            data.cell.styles.fontStyle = 'bold'
          }
        }
        if (data.column.index === COL.TIPO) {
          const tipo = String(data.cell.raw ?? '')
          if (tipo.includes('Festivo') && tipo.includes('Notturno')) {
            data.cell.styles.textColor = [139, 92, 246]
            data.cell.styles.fontStyle = 'bold'
          } else if (tipo === 'Festivo') {
            data.cell.styles.textColor = [225, 29, 72]
            data.cell.styles.fontStyle = 'bold'
          } else if (tipo === 'Notturno') {
            data.cell.styles.textColor = [99, 102, 241]
            data.cell.styles.fontStyle = 'bold'
          } else if (tipo === 'Riposo') {
            data.cell.styles.textColor = [148, 163, 184]
          }
        }
      },
    })

    // Riepilogo su pagina nuova
    const riepiloghiRighe = calcolaRiepilogoDipendenti(turni, festivi).righe.length
    if (riepiloghiRighe > 0) {
      doc.addPage()
      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.text('Riepilogo ore per dipendente', 10, 12)
      renderRiepilogo(doc, autoTable, turni, festivi, 16, 11)
    }
  }

  // Footer pagine
  const totPagine = doc.getNumberOfPages()
  for (let i = 1; i <= totPagine; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`Pagina ${i} di ${totPagine}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 5)
  }

  doc.save(`${filename}.pdf`)
}
