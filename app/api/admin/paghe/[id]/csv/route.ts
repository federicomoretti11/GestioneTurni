import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    // Verify user authentication and role
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('ruolo')
      .eq('id', user.id)
      .single()

    if (!['admin', 'manager'].includes(profile?.ruolo ?? '')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Verify auth and get tenant
    const tenantId = await requireTenantId()
    const { id } = await params

    // Create admin client
    const admin = createAdminClient()

    // Fetch consuntivo
    const { data: consuntivo, error: consError } = await admin
      .from('consuntivi_paghe')
      .select('mese, tenant_id, tenants(nome)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (consError || !consuntivo) {
      return NextResponse.json({ error: 'Consuntivo non trovato' }, { status: 404 })
    }

    // Fetch righe with profile info
    // Sicuro: consuntivo_id già verificato appartenere al tenant tramite consuntivo_paghe
    const { data: righe, error: righeError } = await admin
      .from('consuntivi_righe')
      .select('*, profile:profiles!consuntivi_righe_dipendente_id_fkey(nome, cognome)')
      .eq('consuntivo_id', id)
      .order('profile(cognome)', { ascending: true })

    if (righeError) {
      return NextResponse.json(
        { error: 'Errore nel recupero delle righe' },
        { status: 500 }
      )
    }

    // Generate CSV
    const csvHeader =
      'Cognome,Nome,Ore Ordinarie,Ore Notturne,Ore Festive,Ore Straordinarie,Giorni Ferie,Giorni Permesso,Giorni Malattia,Totale Turni'

    const csvRows = (righe || []).map((riga: any) => {
      const profile = riga.profile as any
      const cognome = (profile?.cognome || '').replace(/,/g, ' ')
      const nome = (profile?.nome || '').replace(/,/g, ' ')

      return [
        cognome,
        nome,
        // Ore decimali (con punto)
        (riga.ore_ordinarie ?? 0).toFixed(2),
        (riga.ore_notturne ?? 0).toFixed(2),
        (riga.ore_festive ?? 0).toFixed(2),
        (riga.ore_straordinarie ?? 0).toFixed(2),
        // Giorni interi
        Math.floor(riga.giorni_ferie ?? 0),
        Math.floor(riga.giorni_permesso ?? 0),
        Math.floor(riga.giorni_malattia ?? 0),
        Math.floor(riga.turni_count ?? 0),
      ].join(',')
    })

    const csv = [csvHeader, ...csvRows].join('\n')

    // Generate filename
    const meseParts = consuntivo.mese.split('-') // es. "2026-05-01" -> ["2026", "05", "01"]
    const yearMonth = `${meseParts[0]}-${meseParts[1]}` // "2026-05"

    const tenantNome = (consuntivo.tenants?.nome || 'tenant')
      .toLowerCase()
      .replace(/\s+/g, '_') // spazi -> underscore
      .replace(/[^a-z0-9_]/g, '') // rimuovi caratteri speciali

    const filename = `paghe_${yearMonth}_${tenantNome}.csv`

    // Add UTF-8 BOM
    const bom = '﻿'

    return new Response(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Errore export CSV paghe:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
