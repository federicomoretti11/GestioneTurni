import { StatoTimbratura } from '@/lib/utils/turni'

interface Props {
  stato: StatoTimbratura
  oraIngresso?: string | null
  oraUscita?: string | null
  size?: 'sm' | 'md'
  className?: string
}

function formatOra(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function buildTitle(stato: StatoTimbratura, oraIngresso?: string | null, oraUscita?: string | null): string | undefined {
  if (!oraIngresso) return undefined
  const ing = formatOra(oraIngresso)
  if (stato === 'completato' && oraUscita) {
    return `Ingresso ${ing} · Uscita ${formatOra(oraUscita)}`
  }
  if (stato === 'in_corso') {
    return `Ingresso ${ing} · in corso`
  }
  return undefined
}

export function PallinoTimbratura({ stato, oraIngresso, oraUscita, size = 'sm', className = '' }: Props) {
  if (stato === 'non_iniziato') return null

  const dim = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const colore = stato === 'completato' ? 'bg-emerald-500' : 'bg-amber-500'
  const label = stato === 'completato' ? 'Turno completato' : 'Turno in corso'
  const title = buildTitle(stato, oraIngresso, oraUscita)

  return (
    <span
      className={`inline-block rounded-full ring-2 ring-white ${dim} ${colore} ${className}`}
      aria-label={label}
      title={title}
    />
  )
}
