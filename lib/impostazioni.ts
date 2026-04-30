import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantId } from '@/lib/tenant'

export async function isEmailAbilitata(): Promise<boolean> {
  try {
    const tenantId = getTenantId()
    if (!tenantId) return false
    const { data } = await createAdminClient()
      .from('impostazioni')
      .select('email_notifiche_abilitato')
      .eq('tenant_id', tenantId)
      .single()
    return data?.email_notifiche_abilitato ?? false
  } catch {
    return false
  }
}
