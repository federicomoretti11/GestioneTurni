'use client'
import Link from 'next/link'

export function ViewSwitcher({ attiva, hrefDipendente, hrefPosto }: {
  attiva: 'dipendente' | 'posto'
  hrefDipendente: string
  hrefPosto: string
}) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
      <Link
        href={hrefDipendente}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          attiva === 'dipendente'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Per dipendente
      </Link>
      <Link
        href={hrefPosto}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          attiva === 'posto'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Per posto
      </Link>
    </div>
  )
}
