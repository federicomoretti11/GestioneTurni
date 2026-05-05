'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Notifiche } from '@/components/layout/Notifiche'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { RuoloUtente } from '@/lib/types'

interface NavItem { label: string; href: string; icon: string; badge?: number }

interface HeaderProps {
  nomeUtente: string
  ruolo: RuoloUtente
  userId: string
  navItems?: NavItem[]
}

export function Header({ nomeUtente, ruolo, userId, navItems }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const [nome, cognome] = nomeUtente.split(' ')

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        {navItems && navItems.length > 0 && (
          <MobileMenu items={navItems} nomeUtente={nomeUtente} onLogout={handleLogout} />
        )}
        <span className="text-sm text-gray-500 capitalize md:block hidden">{ruolo}</span>
      </div>
      <div className="flex items-center gap-2">
        <Notifiche userId={userId} ruolo={ruolo} />
        <span className="text-sm font-medium text-gray-700 hidden sm:inline ml-1">{nomeUtente}</span>
        <Avatar nome={nome} cognome={cognome} size={30} />
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 ml-1 hidden md:inline">
          Esci
        </button>
      </div>
    </header>
  )
}
