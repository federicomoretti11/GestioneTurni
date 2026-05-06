import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('ruolo, is_super_admin').eq('id', user.id).single()
  const isAdminOrManager = me?.ruolo === 'admin' || me?.ruolo === 'manager' || me?.is_super_admin === true
  if (!isAdminOrManager) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, cognome, ruolo')
    .eq('tenant_id', tenantId)
    .order('cognome')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
