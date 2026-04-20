export function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(date.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function getMonthDays(year: number, month: number): Date[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
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
