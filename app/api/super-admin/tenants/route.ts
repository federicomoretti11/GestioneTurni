import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) return null
  return user
}

export async function GET() {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await request.json()
  const { nome, slug, email_admin, password_admin, nome_admin, cognome_admin } = body

  if (!nome?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'nome e slug sono obbligatori' }, { status: 400 })
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'slug: solo lettere minuscole, numeri e trattini' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Crea il tenant
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .insert({ nome: nome.trim(), slug: slug.trim() })
    .select()
    .single()
  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 })

  // Crea riga impostazioni per il tenant
  await admin.from('impostazioni').insert({
    tenant_id: tenant.id,
    gps_checkin_abilitato: true,
    email_notifiche_abilitato: false,
  })

  // Crea utente admin se fornito
  if (email_admin && password_admin) {
    const { error: authErr } = await admin.auth.admin.createUser({
      email: email_admin,
      password: password_admin,
      user_metadata: {
        nome: nome_admin ?? 'Admin',
        cognome: cognome_admin ?? '',
        ruolo: 'admin',
        tenant_id: tenant.id,
      },
    })
    if (authErr) {
      // Rollback: elimina il tenant appena creato
      await admin.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: `Tenant creato ma utente admin fallito: ${authErr.message}` }, { status: 500 })
    }
  }

  return NextResponse.json(tenant, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 })

  const admin = createAdminClient()

  // Elimina tutti gli utenti auth del tenant
  const { data: profilesList } = await admin
    .from('profiles')
    .select('id')
    .eq('tenant_id', id)
  for (const p of profilesList ?? []) {
    await admin.auth.admin.deleteUser(p.id)
  }

  // Elimina il tenant (CASCADE elimina tutti i dati correlati)
  const { error } = await admin.from('tenants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}

export async function PATCH(request: Request) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await request.json()
  const { id, attivo } = body
  if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .update({ attivo })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
