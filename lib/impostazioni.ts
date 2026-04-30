import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export async function isEmailAbilitata(): Promise<boolean> {
  try {
    const { data } = await createAdminClient()
      .from('impostazioni')
      .select('email_notifiche_abilitato')
      .single()
    return data?.email_notifiche_abilitato ?? false
  } catch {
    return false
  }
}
