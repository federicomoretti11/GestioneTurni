import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { Footer } from '@/components/layout/Footer'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin, nome, cognome')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) redirect('/home')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center gap-4">
        <Logo size={28} variant="white" />
        <span className="font-bold text-sm tracking-tight">Opero Hub</span>
        <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">Super Admin</span>
        <a href="/home" className="ml-auto text-xs text-slate-400 hover:text-white flex items-center gap-1">
          ← Home
        </a>
        <span className="text-xs text-slate-400">{profile.nome} {profile.cognome}</span>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">{children}</main>
      <Footer />
    </div>
  )
}
