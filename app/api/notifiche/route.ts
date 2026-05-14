import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

const GIORNI_RETENTION_LETTE = 10

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const soloNonLette = searchParams.get('non_lette') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)

  const soglia = new Date(Date.now() - GIORNI_RETENTION_LETTE * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('notifiche')
    .delete()
    .eq('letta', true)
    .eq('tenant_id', tenantId)
    .lt('created_at', soglia)

  let query = supabase
    .from('notifiche')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (soloNonLette) query = query.eq('letta', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
