import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { user, supabase }
}

export async function GET(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const categoriaId = searchParams.get('categoria_id')
  if (!categoriaId) return NextResponse.json({ error: 'categoria_id obbligatorio' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('documenti')
    .select('*')
    .eq('categoria_id', categoriaId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const categoriaId = formData.get('categoria_id') as string | null

  if (!file || !categoriaId) {
    return NextResponse.json({ error: 'file e categoria_id obbligatori' }, { status: 400 })
  }

  const docId = crypto.randomUUID()
  const storagePath = `${tenantId}/${docId}/${file.name}`
  const bytes = await file.arrayBuffer()

  const adminClient = createAdminClient()
  const { error: uploadError } = await adminClient.storage
    .from('documenti')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data, error } = await ctx.supabase
    .from('documenti')
    .insert({
      id: docId,
      tenant_id: tenantId,
      categoria_id: categoriaId,
      nome: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      dimensione_bytes: file.size,
      created_by: ctx.user.id,
    })
    .select()
    .single()
  if (error) {
    await adminClient.storage.from('documenti').remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
