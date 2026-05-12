export function generaSigla(nomeTenant: string): string {
  const words = nomeTenant.trim().split(/\s+/).filter(w => /[a-zA-Z]/.test(w))
  if (words.length === 0) return 'XXX'
  const initials = words.map(w => w.replace(/[^a-zA-Z]/g, '')[0] ?? '').join('').toUpperCase()
  if (initials.length >= 3) return initials.slice(0, 3)
  const firstWord = words[0].replace(/[^a-zA-Z]/g, '').toUpperCase()
  return (initials + firstWord.slice(initials.length)).slice(0, 3).padEnd(3, 'X')
}

export function generaMatricola(sigla: string, esistenti: string[]): string {
  const s = sigla.toUpperCase()
  const pattern = new RegExp(`^${s}(\\d+)$`)
  let max = 0
  for (const m of esistenti) {
    const match = m.match(pattern)
    if (match) max = Math.max(max, parseInt(match[1], 10))
  }
  return `${s}${String(max + 1).padStart(4, '0')}`
}
