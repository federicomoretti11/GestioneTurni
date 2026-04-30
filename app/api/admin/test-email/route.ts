import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmailSbloccoApprovato } from '@/lib/email'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profilo } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profilo?.ruolo !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const email = user.email
  if (!email) return NextResponse.json({ error: 'Email non disponibile' }, { status: 400 })

  await sendEmailSbloccoApprovato({ toEmail: email, dataTurno: new Date().toISOString().slice(0, 10) })

  return NextResponse.json({ ok: true, sentTo: email })
}
