import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { broadcastNotifiche } from '@/lib/notifiche'
import { NextResponse } from 'next/server'

const MESI_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { user, supabase }
}

export async function GET() {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('cedolini')
    .select('*, profile:profiles!dipendente_id(nome, cognome)')
    .order('mese', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const dipendenteId = formData.get('dipendente_id') as string | null
  const mese = formData.get('mese') as string | null  // "YYYY-MM" da input[type=month]

  if (!file || !dipendenteId || !mese) {
    return NextResponse.json({ error: 'file, dipendente_id e mese obbligatori' }, { status: 400 })
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mese)) {
    return NextResponse.json({ error: 'Formato mese non valido (YYYY-MM)' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Solo file PDF accettati' }, { status: 400 })
  }

  const [anno, meseNum] = mese.split('-')
  const nomeMese = MESI_IT[parseInt(meseNum) - 1] ?? meseNum
  const nome = `Cedolino ${nomeMese} ${anno}`
  const meseDate = `${mese}-01`

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '_')
  const cedolinoId = crypto.randomUUID()
  const storagePath = `cedolini/${tenantId}/${cedolinoId}/${safeFilename}`
  const bytes = await file.arrayBuffer()

  const adminClient = createAdminClient()
  const { error: uploadError } = await adminClient.storage
    .from('documenti')
    .upload(storagePath, bytes, { contentType: file.type || 'application/pdf', upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data, error } = await ctx.supabase
    .from('cedolini')
    .insert({
      id: cedolinoId,
      tenant_id: tenantId,
      dipendente_id: dipendenteId,
      nome,
      mese: meseDate,
      storage_path: storagePath,
      dimensione_bytes: file.size,
      created_by: ctx.user.id,
    })
    .select()
    .single()
  if (error) {
    await adminClient.storage.from('documenti').remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminClient.from('notifiche').insert({
    destinatario_id: dipendenteId,
    tipo: 'cedolino_disponibile',
    titolo: 'Cedolino disponibile',
    messaggio: `È disponibile il tuo cedolino: ${nome}`,
    tenant_id: tenantId,
  })
  await broadcastNotifiche([dipendenteId])

  return NextResponse.json(data, { status: 201 })
}
