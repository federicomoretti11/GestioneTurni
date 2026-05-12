import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Footer } from '@/components/layout/Footer'

export default async function SupportoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('ruolo, is_super_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_super_admin) redirect('/super-admin/chat')

  const backHref = profile?.ruolo === 'dipendente'
    ? '/dipendente/turni'
    : profile?.ruolo === 'manager'
    ? '/manager/calendario'
    : '/admin/calendario'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <Logo size={26} />
        <span className="text-sm font-semibold text-slate-800">Supporto</span>
        <div className="ml-auto">
          <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-800">
            ← Torna all&apos;app
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  )
}
