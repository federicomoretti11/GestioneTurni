'use client'
import { useEffect, useState } from 'react'
import type { ImpostazioniTenant } from '@/lib/types'

interface Props {
  modulo: keyof ImpostazioniTenant
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function FeatureGate({ modulo, fallback = null, children }: Props) {
  const [abilitato, setAbilitato] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/impostazioni')
      .then(r => r.ok ? r.json() : null)
      .then((imp: ImpostazioniTenant | null) => {
        setAbilitato(imp ? (imp[modulo] as boolean) : false)
      })
      .catch(() => setAbilitato(false))
  }, [modulo])

  if (abilitato === null) return null
  return abilitato ? <>{children}</> : <>{fallback}</>
}
