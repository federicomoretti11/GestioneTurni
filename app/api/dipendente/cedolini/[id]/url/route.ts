import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // RLS garantisce che il dipendente veda solo i suoi cedolini
  const { data: cedolino } = await supabase
    .from('cedolini')
    .select('storage_path, nome')
    .eq('id', params.id)
    .eq('dipendente_id', user.id)
    .single()
  if (!cedolino) return NextResponse.json({ error: 'Cedolino non trovato' }, { status: 404 })

  const { data } = await createAdminClient().storage
    .from('documenti')
    .createSignedUrl(cedolino.storage_path, 60, { download: cedolino.nome })

  return NextResponse.json({ download_url: data?.signedUrl ?? null })
}
