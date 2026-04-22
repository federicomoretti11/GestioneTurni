import { Festivo, TurnoConDettagli } from '@/lib/types'
import { formatDateIT, formatTimeShort } from './date'
import { calcolaOreDiurneNotturne, calcolaOreTurno } from './turni'
import { trovaFestivo } from './maggiorazioni'

function formatOre(n: number): number | string {
  if (n === 0) return 0
  // xlsx preserva i numeri: manteniamo numeric per somme automatiche.
  return Math.round(n * 100) / 100
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
    'Notturne (22–06)',
    'Festivo',
    'Ore festive',
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
        festivo?.nome ?? '',
        oreFestive > 0 ? formatOre(oreFestive) : '',
        t.note ?? '',
      ])
    }
    tot.ore += subtot.ore
    tot.diurne += subtot.diurne
    tot.notturne += subtot.notturne
    tot.festive += subtot.festive

    rows.push([
      '',
      `Subtotale ${nome}`,
      '',
      '',
      '',
      '',
      formatOre(subtot.ore),
      formatOre(subtot.diurne),
      formatOre(subtot.notturne),
      '',
      subtot.festive > 0 ? formatOre(subtot.festive) : '',
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
    '',
    tot.festive > 0 ? formatOre(tot.festive) : '',
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
  const rows = turniToExcelRows(turni, festivi)
  autoTable(doc, {
    head: [rows[0] as string[]],
    body: rows.slice(1) as string[][],
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  })
  doc.save(`${filename}.pdf`)
}
