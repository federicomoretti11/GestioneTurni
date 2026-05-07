import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

const PAGE_SIZE = 20

export default async function UtentiPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = createClient()
  const { data: utenti, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('cognome')
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Utenti</h1>
        <Link href="/admin/utenti/nuovo"><Button>+ Nuovo utente</Button></Link>
      </div>
      <div className="bg-white rounded-xl border border-slate-900/20 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-slate-400">Nome</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-slate-400">Ruolo</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-slate-400">Stato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {utenti?.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-3">
                    <Avatar nome={u.nome} cognome={u.cognome} size={32} />
                    <span>{u.cognome} {u.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-slate-500">{u.ruolo}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.attivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.attivo ? 'Attivo' : 'Disattivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/utenti/${u.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Modifica</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-[12px] text-slate-400">
              {from + 1}–{Math.min(to + 1, count ?? 0)} di {count} utenti
            </p>
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Link href={`?page=${page - 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  ← Precedente
                </Link>
              )}
              {page < totalPages && (
                <Link href={`?page=${page + 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  Successiva →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
