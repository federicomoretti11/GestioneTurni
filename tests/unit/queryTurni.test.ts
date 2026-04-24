import { describe, it, expect, vi } from 'vitest'
import { queryTurni } from '@/lib/supabase/turni'

function makeClientMock() {
  const eq = vi.fn().mockReturnThis()
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, select, eq, client: { from } as never }
}

describe('queryTurni', () => {
  it('filtra per stato=confermato di default', () => {
    const m = makeClientMock()
    queryTurni(m.client)
    expect(m.from).toHaveBeenCalledWith('turni')
    expect(m.select).toHaveBeenCalledWith('*')
    expect(m.eq).toHaveBeenCalledWith('stato', 'confermato')
  })

  it('filtra per stato=bozza quando richiesto', () => {
    const m = makeClientMock()
    queryTurni(m.client, 'bozza')
    expect(m.eq).toHaveBeenCalledWith('stato', 'bozza')
  })

  it('non applica alcun filtro con "tutti"', () => {
    const m = makeClientMock()
    queryTurni(m.client, 'tutti')
    expect(m.eq).not.toHaveBeenCalled()
  })

  it('passa una select custom se fornita', () => {
    const m = makeClientMock()
    queryTurni(m.client, 'confermati', '*, profile:profiles(*)')
    expect(m.select).toHaveBeenCalledWith('*, profile:profiles(*)')
  })
})
