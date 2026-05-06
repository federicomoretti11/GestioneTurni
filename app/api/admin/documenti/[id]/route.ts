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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { nome } = await request.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'nome obbligatorio' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('documenti')
    .update({ nome: nome.trim() })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data: doc } = await ctx.supabase
    .from('documenti')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  const { error } = await ctx.supabase
    .from('documenti')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (doc?.storage_path) {
    const adminClient = createAdminClient()
    await adminClient.storage.from('documenti').remove([doc.storage_path])
  }

  return new NextResponse(null, { status: 204 })
}
