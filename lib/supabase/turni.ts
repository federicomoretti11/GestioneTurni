import type { SupabaseClient } from '@supabase/supabase-js'

export type FiltroTurni = 'confermati' | 'bozza' | 'tutti'

/**
 * Helper centralizzato per leggere turni.
 * Default: solo turni confermati. Per leggere bozze o entrambi, passarlo esplicitamente.
 */
export function queryTurni(
  client: SupabaseClient,
  filtro: FiltroTurni = 'confermati',
  select = '*'
) {
  const q = client.from('turni').select(select)
  if (filtro === 'confermati') return q.eq('stato', 'confermato')
  if (filtro === 'bozza') return q.eq('stato', 'bozza')
  return q
}
