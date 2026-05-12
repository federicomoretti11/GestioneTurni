import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  if (body.stato !== 'archiviata') {
    return NextResponse.json({ error: 'Solo archiviata è un valore valido' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()

  // Se non super-admin, verifica proprietà
  if (!profile?.is_super_admin) {
    const { data: conv } = await supabase
      .from('chat_conversazioni')
      .select('id')
      .eq('id', params.id)
      .eq('utente_id', user.id)
      .maybeSingle()
    if (!conv) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('chat_conversazioni')
    .update({ stato: 'archiviata' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
