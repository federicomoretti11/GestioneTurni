import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'
import { sendEmailAttivazioneAccount } from '@/lib/email'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const { data: profilo } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profilo?.ruolo !== 'admin' && profilo?.ruolo !== 'manager') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const tenantId = requireTenantId()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('cognome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const { data: profilo } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profilo?.ruolo !== 'admin' && profilo?.ruolo !== 'manager') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const tenantId = requireTenantId()
  const body = await request.json()

  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: false,
    user_metadata: { nome: body.nome, cognome: body.cognome, ruolo: body.ruolo, tenant_id: tenantId },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email: body.email,
    password: body.password,
  })

  if (linkData?.properties?.action_link) {
    await sendEmailAttivazioneAccount({
      toEmail: body.email,
      nome: body.nome,
      cognome: body.cognome,
      linkAttivazione: linkData.properties.action_link,
    })
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
