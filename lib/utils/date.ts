export function getWeekDays(date: Date): Date[] {
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff))
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86400000))
}

export function getMonthDays(year: number, month: number): Date[] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(year, month, i + 1)))
}

export function formatDateIT(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function formatTimeShort(time: string): string {
  return time.slice(0, 5)
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
}

export function getDaysBetween(inizio: string, fine: string): Date[] {
  const [y1, m1, d1] = inizio.split('-').map(Number)
  const [y2, m2, d2] = fine.split('-').map(Number)
  const start = Date.UTC(y1, m1 - 1, d1)
  const end = Date.UTC(y2, m2 - 1, d2)
  const giorni: Date[] = []
  for (let t = start; t <= end; t += 86400000) giorni.push(new Date(t))
  return giorni
}
