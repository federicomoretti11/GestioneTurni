# Storico Consuntivi Paghe — Design Spec

**Data:** 2026-05-11  
**Branch:** dev

---

## Obiettivo

Permettere all'admin di consultare e riaprire i consuntivi paghe già approvati nei mesi precedenti, senza dover re-impostare manualmente il mese e ricordare quali mesi sono stati approvati.

## Comportamento

### Layout pagina `/admin/paghe`

La pagina attuale ha: selettore mese → bottone Calcola → tabella → Approva/Esporta.

Con questa feature si aggiunge **sopra il selettore mese** una sezione collassabile **"Storico approvazioni"** che mostra la lista dei consuntivi già approvati.

### Lista storico

Ogni riga mostra:
- **Mese** (es. "Aprile 2026")
- **Approvato il** (data e ora)
- **Da** (nome dell'approvatore)
- Pulsante **"Riapri"**

Ordinamento: dal più recente al più vecchio.

### Azione "Riapri"

Cliccando "Riapri":
1. Il selettore mese si imposta sul mese del consuntivo
2. Parte automaticamente il ricalcolo (`handleCalcola()`)
3. La tabella mostra i dati ricalcolati (turni attuali nel DB per quel mese)
4. Il badge mostra "Approvato" con data/approvatore del consuntivo precedente
5. L'admin può modificare turni se necessario, poi cliccare "Approva" di nuovo — sovrascrive il consuntivo esistente (upsert già implementato)

---

## Architettura

### Nuova API

**`GET /api/admin/paghe/storico`**

- Auth: admin o manager
- Restituisce tutti i `consuntivi_paghe` approvati del tenant, ordinati per `mese DESC`
- Response:
```ts
{
  storico: {
    id: string
    mese: string          // "YYYY-MM-01"
    approvato_at: string  // ISO timestamp
    approvato_da_nome: string | null
  }[]
}
```

### Modifiche alla pagina `/admin/paghe`

- Nuova fetch `GET /api/admin/paghe/storico` al mount della pagina
- Stato `storico: StoricoItem[]`
- Sezione collassabile sopra il selettore mese (di default aperta se `storico.length > 0`, chiusa se vuoto)
- Il click su "Riapri" imposta `mese` e chiama `handleCalcola()`

---

## File coinvolti

| File | Azione |
|------|--------|
| `app/api/admin/paghe/storico/route.ts` | Crea — GET lista consuntivi approvati |
| `app/admin/paghe/page.tsx` | Modifica — fetch storico + sezione lista + logica Riapri |

---

## Fuori scope

- Eliminazione di un consuntivo approvato
- Accesso manager alla pagina paghe (feature separata)
- Confronto tra versioni diverse dello stesso mese
