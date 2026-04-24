'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useBozzaCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function carica() {
      const res = await fetch('/api/turni/bozza-count')
      if (!res.ok) return
      const d = await res.json()
      if (mounted) setCount(d.count ?? 0)
    }
    carica()

    const canale = supabase
      .channel('bozza_count_turni')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turni' }, () => carica())
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(canale) }
  }, [])
  return count
}
