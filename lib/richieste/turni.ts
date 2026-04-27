import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Richiesta, CategoriaTemplate, TipoRichiesta } from '@/lib/types'

export function dateRange(dataInizio: string, dataFine: string): string[] {
  const result: string[] = []
  const start = new Date(dataInizio + 'T00:00:00Z')
  const end = new Date(dataFine + 'T00:00:00Z')
  if (end < start) return result
  const cur = new Date(start)
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return result
}

export interface Conflitto {
  data: string
  turno_id: string
  ora_inizio: string
  ora_fine: string
}

export async function checkConflitti(
  dipendenteId: string,
  dataInizio: string,
  dataFine: string,
  supabase: SupabaseClient
): Promise<Conflitto[]> {
  const giorni = dateRange(dataInizio, dataFine)
  if (!giorni.length) return []

  const { data, error } = await supabase
    .from('turni')
    .select('id, data, ora_inizio, ora_fine')
    .eq('dipendente_id', dipendenteId)
    .eq('stato', 'confermato')
    .in('data', giorni)

  if (error) throw new Error(`checkConflitti: ${error.message}`)

  return (data ?? []).map(t => ({
    data: t.data,
    turno_id: t.id,
    ora_inizio: t.ora_inizio,
    ora_fine: t.ora_fine,
  }))
}

export async function createTurniDaRichiesta(
  richiesta: Richiesta,
  sovrascriviConflitti: boolean,
  adminId: string,
  supabase: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const categoriaMap: Partial<Record<TipoRichiesta, CategoriaTemplate>> = {
    ferie: 'ferie', permesso: 'permesso', malattia: 'malattia',
  }
  const categoria = categoriaMap[richiesta.tipo]
  if (!categoria) return { ok: false, error: 'Tipo richiesta non genera turni' }

  const { data: template } = await supabase
    .from('turni_template')
    .select('id, ora_inizio, ora_fine')
    .eq('categoria', categoria)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!template) {
    return { ok: false, error: `Nessun template attivo con categoria "${categoria}". Creane uno prima di approvare.` }
  }

  const dataFine = richiesta.data_fine ?? richiesta.data_inizio
  const giorni = dateRange(richiesta.data_inizio, dataFine)

  const oraInizio = (richiesta.tipo === 'permesso' && richiesta.permesso_tipo === 'ore' && richiesta.ora_inizio)
    ? richiesta.ora_inizio
    : template.ora_inizio
  const oraFine = (richiesta.tipo === 'permesso' && richiesta.permesso_tipo === 'ore' && richiesta.ora_fine)
    ? richiesta.ora_fine
    : template.ora_fine

  const giorniDaCreare = richiesta.tipo === 'permesso' ? [richiesta.data_inizio] : giorni

  const righe = giorniDaCreare.map(data => ({
    dipendente_id: richiesta.dipendente_id,
    template_id: template.id,
    data,
    ora_inizio: oraInizio,
    ora_fine: oraFine,
    stato: 'confermato' as const,
    creato_da: adminId,
    note: `Da richiesta ${richiesta.tipo} #${richiesta.id.slice(0, 8)}`,
  }))

  if (!righe.length) return { ok: true }

  const { error } = await supabase.from('turni').insert(righe)
  if (error) return { ok: false, error: error.message }

  // Delete only after successful insert (prevents data loss if insert fails)
  if (sovrascriviConflitti) {
    await supabase
      .from('turni')
      .delete()
      .eq('dipendente_id', richiesta.dipendente_id)
      .eq('stato', 'confermato')
      .in('data', giorni)
  }

  return { ok: true }
}
