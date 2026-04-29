# Menu Riorganizzazione — Design Spec

## Contesto

Il menu di navigazione è cresciuto organicamente con ogni nuovo sviluppo, producendo 11 voci piatte per l'Admin e 7 per il Manager senza una struttura logica. L'obiettivo è riorganizzarlo con sezioni etichettate prima del go-live previsto per venerdì.

---

## Decisioni di design

- **Struttura**: sezioni etichettate (uppercase, colore muted) — no collapsing, sempre visibili
- **Gruppi**: Calendario · Programmazione · Gestione · Configurazione (solo Admin)
- **Rinominare**: voci ridondanti accorciate sfruttando il contesto della sezione
- **Applicazione**: sia Admin che Manager con struttura identica (Manager senza sezione Configurazione)

---

## Menu Admin (nuovo)

| Sezione | Voce | Route | Badge | Era |
|---------|------|-------|-------|-----|
| *(nessuna)* | Dashboard | `/admin/dashboard` | — | invariato |
| **CALENDARIO** | Per dipendente | `/admin/calendario` | — | era "Calendario" |
| | Per posto | `/admin/calendario-posti` | — | era "Per posto" |
| **PROGRAMMAZIONE** | Per dipendente | `/admin/calendario-programmazione` | bozze | era "Programmazione" |
| | Per posto | `/admin/calendario-programmazione-posti` | — | era "Programmazione per posto" |
| **GESTIONE** | Modelli turno | `/admin/template` | — | era "Turni" |
| | Richieste | `/admin/richieste` | richieste | invariato |
| | Export | `/admin/export` | — | invariato |
| **CONFIGURAZIONE** | Utenti | `/admin/utenti` | — | invariato |
| | Posti | `/admin/posti` | — | invariato |
| | Festivi | `/admin/festivi` | — | invariato |

---

## Menu Manager (nuovo)

| Sezione | Voce | Route | Badge | Era |
|---------|------|-------|-------|-----|
| **CALENDARIO** | Per dipendente | `/manager/calendario` | — | era "Calendario" |
| | Per posto | `/manager/calendario-posti` | — | era "Per posto" |
| **PROGRAMMAZIONE** | Per dipendente | `/manager/calendario-programmazione` | — | era "Programmazione" |
| | Per posto | `/manager/calendario-programmazione-posti` | — | era "Programmazione per posto" |
| **GESTIONE** | Richieste | `/manager/richieste` | richieste | invariato |
| | Modelli turno | `/manager/template` | — | era "Turni" |
| | Export | `/manager/export` | — | invariato |

---

## File da modificare

| File | Modifica |
|------|----------|
| `components/layout/Sidebar.tsx` | Estendere `NavItem` con campo opzionale `section?: string`; quando presente, renderizzare un'intestazione di sezione sopra la voce |
| `components/layout/SidebarAdmin.tsx` | Riorganizzare l'array `BASE_ITEMS` aggiungendo `section` alla prima voce di ogni gruppo e rinominando le voci |
| `components/layout/SidebarManager.tsx` | Stessa cosa, senza sezione Configurazione |

### Strategia per le sezioni in `Sidebar.tsx`

Aggiungere `section?: string` a `NavItem`. Nel render, confrontare la sezione dell'item corrente con quella del precedente: quando cambia (o è il primo item con sezione), inserire un `<div>` con l'etichetta prima del link. Dashboard rimane senza `section` e viene renderizzato prima di tutti.

```ts
// Esempio array in SidebarAdmin.tsx
{ label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
{ section: 'Calendario', label: 'Per dipendente', href: '/admin/calendario', icon: '📅' },
{ label: 'Per posto', href: '/admin/calendario-posti', icon: '📍' },
// ...
```

---

## Verifica

1. Aprire `/admin/dashboard` → verificare che il menu mostri le 4 sezioni etichettate
2. Verificare che i badge (bozze, richieste) siano ancora visibili nelle voci corrette
3. Aprire una vista Manager → verificare 3 sezioni senza Configurazione
4. Navigare su ogni voce e verificare che la route rispettiva si carichi correttamente
5. Verificare che la voce attiva sia evidenziata in blu nella sezione giusta
