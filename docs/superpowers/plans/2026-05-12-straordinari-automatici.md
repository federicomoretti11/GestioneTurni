# Feature 2: Straordinari Automatici — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usare le ore_giornaliere del contratto come soglia per il calcolo straordinari nel consuntivo paghe, invece delle ore pianificate del turno.

**Architecture:** Modifica chirurgica a `app/api/admin/paghe/route.ts`. Se `modulo_straordinari_abilitato = true` e il dipendente ha un contratto, la soglia giornaliera è `ore_giornaliere` dal contratto; altrimenti comportamento invariato.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript. Solo modifica server-side.

---

### Task 1: Modifica calcolo straordinari in `app/api/admin/paghe/route.ts`

**Files:**
- Modify: `app/api/admin/paghe/route.ts`

Il file attuale usa `orePianificate` come soglia per gli straordinari (righe 137-146):
```typescript
// Straordinari: solo se timbratura completa
if (turno.ora_ingresso_effettiva && turno.ora_uscita_effettiva) {
  const oreEffettive = calcolaOreTurno(
    (turno.ora_ingresso_effettiva as string).slice(11, 16),
    (turno.ora_uscita_effettiva as string).slice(11, 16)
  )
  const orePianificate = calcolaOreTurno(oraInizio, oraFine)
  const diff = oreEffettive - orePianificate
  if (diff > 0) riga.ore_straordinarie += diff
}
```

- [ ] **Step 1: Aggiungere import `getImpostazioni`**

In cima al file, dopo la riga `import { NextResponse } from 'next/server'`, aggiungere:

```typescript
import { getImpostazioni } from '@/lib/impostazioni'
```

- [ ] **Step 2: Fetchare impostazioni e contratti in parallelo**

Nel handler `GET`, dopo la riga `const data_fine = ultimoGiornoMese(mese)` e prima del blocco `const supabase = createClient()`, aggiungere:

```typescript
  const imp = await getImpostazioni()
  const straordinariAbilitati = imp.modulo_straordinari_abilitato

  let contrattiMap = new Map<string, number>()
  if (straordinariAbilitati) {
    const { data: contratti } = await createAdminClient()
      .from('contratti_dipendenti')
      .select('dipendente_id, ore_giornaliere')
      .eq('tenant_id', tenantId)
    contrattiMap = new Map(
      (contratti ?? []).map(c => [c.dipendente_id as string, c.ore_giornaliere as number])
    )
  }
```

- [ ] **Step 3: Sostituire il blocco calcolo straordinari**

Trovare e sostituire il blocco (righe 137-146):

```typescript
    // Straordinari: solo se timbratura completa
    if (turno.ora_ingresso_effettiva && turno.ora_uscita_effettiva) {
      const oreEffettive = calcolaOreTurno(
        (turno.ora_ingresso_effettiva as string).slice(11, 16),
        (turno.ora_uscita_effettiva as string).slice(11, 16)
      )
      const orePianificate = calcolaOreTurno(oraInizio, oraFine)
      const diff = oreEffettive - orePianificate
      if (diff > 0) riga.ore_straordinarie += diff
    }
```

Con:

```typescript
    // Straordinari: solo se timbratura completa
    if (turno.ora_ingresso_effettiva && turno.ora_uscita_effettiva) {
      const oreEffettive = calcolaOreTurno(
        (turno.ora_ingresso_effettiva as string).slice(11, 16),
        (turno.ora_uscita_effettiva as string).slice(11, 16)
      )
      const soglia = straordinariAbilitati && contrattiMap.has(turno.dipendente_id)
        ? contrattiMap.get(turno.dipendente_id)!
        : calcolaOreTurno(oraInizio, oraFine)
      const diff = oreEffettive - soglia
      if (diff > 0) riga.ore_straordinarie += diff
    }
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/paghe/route.ts
git commit -m "feat(straordinari): calcolo basato su ore_giornaliere contratto"
```

---

### Task 2: Smoke test manuale

- [ ] **Step 1: Verificare comportamento senza modulo attivo**

Con `modulo_straordinari_abilitato = false` nelle impostazioni: aprire `/admin/paghe`, selezionare un mese con turni timbrati → gli straordinari devono essere calcolati come prima (effettive - pianificate).

- [ ] **Step 2: Attivare il modulo e configurare un contratto**

`/admin/impostazioni` → attivare "Straordinari automatici". Poi `/admin/utenti/[id]` → impostare contratto con `ore_giornaliere = 8`.

- [ ] **Step 3: Verificare il nuovo calcolo**

Dipendente con contratto 8h/giorno che timbra 10h su un turno da 9h pianificate:
- **Prima**: ore_straordinarie = 10 - 9 = 1h
- **Adesso**: ore_straordinarie = 10 - 8 = 2h

- [ ] **Step 4: Verificare fallback senza contratto**

Dipendente senza contratto configurato: il calcolo deve restare invariato (effettive - pianificate).
