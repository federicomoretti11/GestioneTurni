// app/api/richieste/pending-count/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { data: profile } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()

  if (profile?.ruolo === 'dipendente') {
    // Badge dipendente: notifiche non lette di tipo richiesta
    const { count } = await supabase
      .from('notifiche')
      .select('id', { count: 'exact', head: true })
      .eq('destinatario_id', user.id)
      .eq('letta', false)
      .in('tipo', ['richiesta_approvata', 'richiesta_rifiutata'])
    return NextResponse.json({ count: count ?? 0 })
  }

  if (profile?.ruolo === 'manager') {
    const { count } = await supabase
      .from('richieste')
      .select('id', { count: 'exact', head: true })
      .eq('stato', 'pending')
    return NextResponse.json({ count: count ?? 0 })
  }

  // Admin: pending + approvata_manager
  const { count } = await supabase
    .from('richieste')
    .select('id', { count: 'exact', head: true })
    .in('stato', ['pending', 'approvata_manager'])
  return NextResponse.json({ count: count ?? 0 })
}
