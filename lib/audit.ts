import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export async function logAzione(params: {
  tabella: 'turni' | 'richieste'
  recordId: string
  azione: string
  utenteId: string
  dettagli?: Record<string, unknown>
  tenantId?: string
}) {
  try {
    await createAdminClient().from('audit_log').insert({
      tabella: params.tabella,
      record_id: params.recordId,
      azione: params.azione,
      utente_id: params.utenteId,
      dettagli: params.dettagli ?? null,
      tenant_id: params.tenantId ?? null,
    })
  } catch {
    // non bloccante — l'audit non deve mai rompere il flusso principale
  }
}
