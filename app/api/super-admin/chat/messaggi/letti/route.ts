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

export async function PATCH(request: Request) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await request.json()
  const { conversazione_id } = body
  if (!conversazione_id) return NextResponse.json({ error: 'conversazione_id obbligatorio' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('chat_messaggi')
    .update({ letto_superadmin: true })
    .eq('conversazione_id', conversazione_id)
    .eq('letto_superadmin', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
