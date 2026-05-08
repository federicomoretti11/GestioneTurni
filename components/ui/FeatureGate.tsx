'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ImpostazioniTenant } from '@/lib/types'

interface Props {
  modulo: keyof ImpostazioniTenant
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function FeatureGate({ modulo, fallback = null, children }: Props) {
  const [abilitato, setAbilitato] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single()
        if (profile?.is_super_admin) { setAbilitato(true); return }
      }
      fetch('/api/impostazioni')
        .then(r => r.ok ? r.json() : null)
        .then((imp: ImpostazioniTenant | null) => {
          setAbilitato(imp ? (imp[modulo] as boolean) : false)
        })
        .catch(() => setAbilitato(false))
    }
    check()
  }, [modulo])

  if (abilitato === null) return null
  return abilitato ? <>{children}</> : <>{fallback}</>
}
