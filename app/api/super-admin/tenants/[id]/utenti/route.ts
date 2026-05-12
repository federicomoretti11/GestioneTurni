import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  return data?.is_super_admin ? true : null
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ok = await checkSuperAdmin()
  if (!ok) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })

  const admin = createAdminClient()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, nome, cognome, ruolo, attivo, created_at')
    .eq('tenant_id', id)
    .order('cognome')

  if (!profiles || profiles.length === 0) return NextResponse.json([])

  const uids = profiles.map(p => p.id)
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  users.forEach(u => { if (uids.includes(u.id)) emailMap[u.id] = u.email ?? '' })

  return NextResponse.json(profiles.map(p => ({
    id: p.id,
    nome: p.nome,
    cognome: p.cognome,
    email: emailMap[p.id] ?? '',
    ruolo: p.ruolo,
    attivo: p.attivo,
    created_at: p.created_at,
  })))
}
