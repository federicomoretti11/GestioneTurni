# Straordinari Automatici — Design

## Goal

Calcolare automaticamente le ore straordinarie di ogni dipendente nel consuntivo paghe, usando come soglia le `ore_giornaliere` del contratto invece delle ore pianificate del turno.

## Architettura

Feature gated da `modulo_straordinari_abilitato`. Se spento, il comportamento è identico a quello attuale (straordinari = effettive − pianificate). Se acceso e il dipendente ha un contratto configurato, la soglia diventa `ore_giornaliere` dal contratto.

Nessuna nuova tabella, nessun nuovo endpoint, nessuna nuova UI. Modifica limitata a `app/api/admin/paghe/route.ts`.

## Logica di calcolo

Per ogni turno con timbratura completa (`ora_ingresso_effettiva` e `ora_uscita_effettiva` presenti):

```
ore_straordinarie += max(0, oreEffettive − sogliaGiornaliera)
```

dove `sogliaGiornaliera`:
- Se `modulo_straordinari_abilitato = true` AND dipendente ha contratto → `ore_giornaliere` dal contratto
- Altrimenti → `calcolaOreTurno(ora_inizio, ora_fine)` (ore pianificate del turno — comportamento attuale)

## Implementazione

In `app/api/admin/paghe/route.ts`:

1. Leggere il flag `modulo_straordinari_abilitato` dalle impostazioni (già fetched in `getImpostazioni`)
2. Se attivo, fetchare tutti i contratti del tenant in una query sola:
   ```typescript
   const { data: contratti } = await createAdminClient()
     .from('contratti_dipendenti')
     .select('dipendente_id, ore_giornaliere')
     .eq('tenant_id', tenantId)
   const contrattiMap = new Map(contratti?.map(c => [c.dipendente_id, c.ore_giornaliere]) ?? [])
   ```
3. Nel ciclo di calcolo per ogni turno, sostituire la soglia:
   ```typescript
   const sogliaGiornaliera = straordinariAbilitati && contrattiMap.has(turno.dipendente_id)
     ? contrattiMap.get(turno.dipendente_id)!
     : orePianificate
   const diff = oreEffettive - sogliaGiornaliera
   if (diff > 0) riga.ore_straordinarie += diff
   ```

## Dipendenze

- Richiede Feature 1 (tabella `contratti_dipendenti`) per funzionare con la nuova logica
- Senza Feature 1 attiva per un dipendente → fallback trasparente al comportamento precedente
- `getImpostazioni()` già presente nella route paghe per altre logiche

## Tech Stack

Next.js 14 App Router, Supabase, TypeScript. Solo modifica server-side alla route esistente.
