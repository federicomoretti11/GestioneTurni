import { createClient } from '@/lib/supabase/server'
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

export async function GET() {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { data, error } = await ctx.supabase
    .from('categorie_documenti')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('ordine')
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { nome } = await request.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'nome obbligatorio' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('categorie_documenti')
    .insert({ tenant_id: tenantId, nome: nome.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
