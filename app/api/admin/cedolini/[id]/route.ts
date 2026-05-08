import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { supabase }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data: cedolino } = await ctx.supabase
    .from('cedolini')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  const { error } = await ctx.supabase
    .from('cedolini')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (cedolino?.storage_path) {
    await createAdminClient().storage.from('documenti').remove([cedolino.storage_path])
  }

  return new NextResponse(null, { status: 204 })
}
