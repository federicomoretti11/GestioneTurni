// components/calendario/BloccoAssenza.tsx

export type TipoAssenza = 'ferie' | 'permesso' | 'malattia'

const STILI: Record<TipoAssenza, { bg: string; text: string; label: string }> = {
  ferie:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Ferie' },
  malattia: { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Malattia' },
  permesso: { bg: 'bg-violet-100', text: 'text-violet-800', label: 'Permesso' },
}

interface BloccoAssenzaProps {
  tipo: TipoAssenza
  onClick: () => void
  compact?: boolean
}

export function BloccoAssenza({ tipo, onClick, compact }: BloccoAssenzaProps) {
  const s = STILI[tipo]
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md px-1.5 text-left font-medium cursor-pointer hover:opacity-80 transition-opacity ${s.bg} ${s.text} ${compact ? 'py-0.5 text-[10px]' : 'py-1 text-xs'}`}
    >
      {s.label}
    </button>
  )
}
