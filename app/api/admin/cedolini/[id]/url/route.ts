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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data: cedolino } = await ctx.supabase
    .from('cedolini')
    .select('storage_path, nome')
    .eq('id', params.id)
    .single()
  if (!cedolino) return NextResponse.json({ error: 'Cedolino non trovato' }, { status: 404 })

  const adminClient = createAdminClient()

  const { data: previewData } = await adminClient.storage
    .from('documenti')
    .createSignedUrl(cedolino.storage_path, 60)

  const { data: downloadData } = await adminClient.storage
    .from('documenti')
    .createSignedUrl(cedolino.storage_path, 60, { download: cedolino.nome })

  return NextResponse.json({
    preview_url: previewData?.signedUrl ?? null,
    download_url: downloadData?.signedUrl ?? null,
  })
}
