'use client'
import { useEffect, useState } from 'react'
import type { Festivo } from '@/lib/types'

// Cache a modulo: evita che ogni componente che chiama useFestivi()
// scateni un fetch separato. Un solo fetch in volo, risultato condiviso.
let cache: Festivo[] | null = null
let inFlight: Promise<Festivo[]> | null = null
const listeners = new Set<(f: Festivo[]) => void>()

async function caricaFestivi(): Promise<Festivo[]> {
  if (cache) return cache
  if (!inFlight) {
    inFlight = fetch('/api/festivi')
      .then(r => r.json())
      .then((d: unknown) => {
        cache = Array.isArray(d) ? (d as Festivo[]) : []
        listeners.forEach(l => l(cache!))
        return cache
      })
      .catch(() => {
        cache = []
        return cache
      })
      .finally(() => { inFlight = null })
  }
  return inFlight
}

export function useFestivi(): Festivo[] {
  const [festivi, setFestivi] = useState<Festivo[]>(cache ?? [])

  useEffect(() => {
    if (cache) { setFestivi(cache); return }
    let alive = true
    const listener = (f: Festivo[]) => { if (alive) setFestivi(f) }
    listeners.add(listener)
    caricaFestivi().then(f => { if (alive) setFestivi(f) })
    return () => { alive = false; listeners.delete(listener) }
  }, [])

  return festivi
}

// Forza un refetch (utile dopo che l'admin crea/elimina un festivo).
export function invalidaFestivi() {
  cache = null
  inFlight = null
}
