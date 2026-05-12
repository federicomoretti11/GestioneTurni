import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContrattoDipendente } from '@/lib/types'

export async function getContrattoDipendente(
  dipendente_id: string,
  tenant_id: string
): Promise<ContrattoDipendente | null> {
  const { data } = await createAdminClient()
    .from('contratti_dipendenti')
    .select('*')
    .eq('dipendente_id', dipendente_id)
    .eq('tenant_id', tenant_id)
    .single()
  return (data as ContrattoDipendente | null) ?? null
}
