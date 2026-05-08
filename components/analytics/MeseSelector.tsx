'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function MeseSelector({ meseCorrente }: { meseCorrente: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Genera ultimi 12 mesi
  const opzioni: { value: string; label: string }[] = []
  const oggi = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    opzioni.push({ value, label })
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('mese', e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={meseCorrente}
      onChange={onChange}
      className="h-9 px-3 rounded-lg border border-slate-900/20 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 capitalize"
    >
      {opzioni.map(o => (
        <option key={o.value} value={o.value} className="capitalize">{o.label}</option>
      ))}
    </select>
  )
}
