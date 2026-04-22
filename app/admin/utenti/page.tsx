import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

export default async function UtentiPage() {
  const supabase = createClient()
  const { data: utenti } = await supabase
    .from('profiles')
    .select('*')
    .order('cognome')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Utenti</h1>
        <Link href="/admin/utenti/nuovo"><Button>+ Nuovo utente</Button></Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ruolo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Stato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {utenti?.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar nome={u.nome} cognome={u.cognome} size={32} />
                    <span>{u.cognome} {u.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">{u.ruolo}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.attivo ? 'Attivo' : 'Disattivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/utenti/${u.id}`} className="text-blue-600 hover:underline text-sm">Modifica</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
