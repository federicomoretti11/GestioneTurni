import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailNuovaRichiestaDemo } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as {
    nome?: string
    email?: string
    azienda?: string
    dipendenti?: string
  } | null

  if (!body) {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { nome, email, azienda, dipendenti } = body

  if (!nome?.trim() || !email?.trim() || !azienda?.trim() || !dipendenti?.trim()) {
    return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: 'Indirizzo email non valido' }, { status: 400 })
  }

  const { error } = await createAdminClient()
    .from('demo_requests')
    .insert({
      nome: nome.trim(),
      email: email.trim(),
      azienda: azienda.trim(),
      dipendenti: dipendenti.trim(),
    })

  if (error) {
    console.error('demo_requests insert error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  await sendEmailNuovaRichiestaDemo({
    nome: nome.trim(),
    email: email.trim(),
    azienda: azienda.trim(),
    dipendenti: dipendenti.trim(),
  })

  return NextResponse.json({ ok: true })
}
