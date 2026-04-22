interface AvatarProps {
  nome: string
  cognome?: string
  size?: number
  className?: string
}

const PALETTE = [
  '#4f46e5', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#e11d48', // rose
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function getIniziali(nome: string, cognome?: string): string {
  const n = (nome ?? '').trim()
  const c = (cognome ?? '').trim()
  if (n && c) return (n[0] + c[0]).toUpperCase()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }
  return '?'
}

export function Avatar({ nome, cognome, size = 32, className = '' }: AvatarProps) {
  const key = `${cognome ?? ''} ${nome ?? ''}`.trim().toLowerCase()
  const colore = PALETTE[hashString(key) % PALETTE.length]
  const iniziali = getIniziali(nome, cognome)

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: colore,
        fontSize: Math.round(size * 0.37),
        letterSpacing: '-0.02em',
      }}
      aria-hidden="true"
    >
      {iniziali}
    </div>
  )
}
