import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) return null
  return user
}

export async function GET() {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('chat_conversazioni')
    .select(`
      id,
      stato,
      created_at,
      updated_at,
      utente:profiles!chat_conversazioni_utente_id_fkey(
        id, nome, cognome, ruolo,
        tenant:tenants!profiles_tenant_id_fkey(nome)
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggiungi count messaggi non letti per ogni conversazione
  const { data: nonLetti } = await admin
    .from('chat_messaggi')
    .select('conversazione_id')
    .eq('letto_superadmin', false)

  const countPerConv: Record<string, number> = {}
  for (const m of nonLetti ?? []) {
    countPerConv[m.conversazione_id] = (countPerConv[m.conversazione_id] ?? 0) + 1
  }

  const result = (data ?? []).map(conv => ({
    ...conv,
    messaggi_non_letti: countPerConv[conv.id] ?? 0,
  }))

  return NextResponse.json(result)
}
