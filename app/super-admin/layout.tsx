import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin, nome, cognome')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) redirect('/admin/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center gap-4">
        <span className="font-bold text-sm tracking-tight">GestioneTurni</span>
        <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">Super Admin</span>
        <a href="/admin/dashboard" className="ml-auto text-xs text-slate-400 hover:text-white flex items-center gap-1">
          ← Dashboard
        </a>
        <span className="text-xs text-slate-400">{profile.nome} {profile.cognome}</span>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  )
}
