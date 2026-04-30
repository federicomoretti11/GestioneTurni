import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('cognome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const tenantId = requireTenantId()
  const body = await request.json()

  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    user_metadata: { nome: body.nome, cognome: body.cognome, ruolo: body.ruolo, tenant_id: tenantId },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { data, error } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
