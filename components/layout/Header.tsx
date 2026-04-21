'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  nomeUtente: string
  ruolo: string
}

export function Header({ nomeUtente, ruolo }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <span className="text-sm text-gray-500 capitalize">{ruolo}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">{nomeUtente}</span>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
          Esci
        </button>
      </div>
    </header>
  )
}
