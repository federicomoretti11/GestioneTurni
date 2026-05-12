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

const BUCKET = 'loghi'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ok = await checkSuperAdmin()
  if (!ok) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Formato non supportato. Usa PNG, JPG, SVG, WebP.' }, { status: 422 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File troppo grande (max 2 MB)' }, { status: 422 })

  const admin = createAdminClient()

  // Crea bucket pubblico se non esiste
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${id}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  // Salva l'URL sul tenant
  await admin.from('tenants').update({ logo_url: publicUrl }).eq('id', id)

  return NextResponse.json({ url: publicUrl })
}
