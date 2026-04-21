import { TurnoConDettagli } from '@/lib/types'
import { formatDateIT, formatTimeShort } from './date'
import { calcolaOreTurno } from './turni'

export function turniToExcelRows(turni: TurnoConDettagli[]): (string | number)[][] {
  const header = ['Dipendente', 'Data', 'Posto di servizio', 'Ora inizio', 'Ora fine', 'Ore', 'Note']

  // Raggruppa per dipendente
  const perDipendente = new Map<string, TurnoConDettagli[]>()
  for (const t of turni) {
    const key = `${t.profile.cognome} ${t.profile.nome}`
    if (!perDipendente.has(key)) perDipendente.set(key, [])
    perDipendente.get(key)!.push(t)
  }

  const rows: (string | number)[][] = []
  let totaleGenerale = 0

  for (const [nome, turniDip] of Array.from(perDipendente)) {
    let totaleDipendente = 0
    for (const t of turniDip) {
      const ore = calcolaOreTurno(t.ora_inizio, t.ora_fine)
      totaleDipendente += ore
      rows.push([
        nome,
        formatDateIT(t.data),
        t.posto?.nome ?? '',
        formatTimeShort(t.ora_inizio),
        formatTimeShort(t.ora_fine),
        ore,
        t.note ?? '',
      ])
    }
    totaleGenerale += totaleDipendente
    rows.push(['', `Subtotale ${nome}`, '', '', '', totaleDipendente, ''])
  }

  rows.push(['', 'TOTALE GENERALE', '', '', '', totaleGenerale, ''])

  return [header, ...rows]
}

export async function exportExcel(turni: TurnoConDettagli[], filename: string) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.aoa_to_sheet(turniToExcelRows(turni))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Turni')
  writeFile(wb, `${filename}.xlsx`)
}

export async function exportCsv(turni: TurnoConDettagli[], filename: string) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.aoa_to_sheet(turniToExcelRows(turni))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Turni')
  writeFile(wb, `${filename}.csv`, { bookType: 'csv' })
}

export async function exportPdf(turni: TurnoConDettagli[], filename: string, periodo: string) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(`Piano Turni — ${periodo}`, 14, 15)
  const rows = turniToExcelRows(turni)
  autoTable(doc, {
    head: [rows[0] as string[]],
    body: rows.slice(1) as string[][],
    startY: 22,
  })
  doc.save(`${filename}.pdf`)
}
