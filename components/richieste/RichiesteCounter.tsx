'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRichiesteCount() {
  const [count, setCount] = useState(0)
  const supabase = createClient()

  async function fetch() {
    const res = await window.fetch('/api/richieste/pending-count')
    if (res.ok) {
      const json = await res.json()
      setCount(json.count ?? 0)
    }
  }

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('richieste-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste' }, fetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifiche' }, fetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifiche' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return count
}
