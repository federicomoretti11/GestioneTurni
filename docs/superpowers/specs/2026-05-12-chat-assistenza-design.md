# Chat di Assistenza — Design Spec

**Goal:** Pannello chat live che permette a qualsiasi utente (dipendente, manager, admin) di ogni tenant di scrivere al super-admin per ricevere supporto in tempo reale.

**Architecture:** Supabase Realtime (`postgres_changes`) su tabella `chat_messaggi`. Pannello slide laterale lato utente, inbox stile messaggistica lato super-admin. Messaggi persistiti nel DB con possibilità di archiviazione.

**Tech Stack:** Next.js 14 App Router, Supabase Realtime, Resend (email notifiche), TypeScript

---

## 1. Database — `031_chat.sql`

### Tabella `chat_conversazioni`
```sql
CREATE TABLE chat_conversazioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  utente_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stato       TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'archiviata')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Una sola conversazione attiva per utente (può riaprirne una nuova dopo archiviazione)
CREATE UNIQUE INDEX chat_conv_utente_aperta ON chat_conversazioni(utente_id) WHERE stato = 'aperta';
```

### Tabella `chat_messaggi`
```sql
CREATE TABLE chat_messaggi (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversazione_id UUID NOT NULL REFERENCES chat_conversazioni(id) ON DELETE CASCADE,
  mittente_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  testo            TEXT NOT NULL,
  letto_superadmin BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_msg_conv ON chat_messaggi(conversazione_id, created_at);
```

### RLS
- `chat_conversazioni`: utente vede solo la propria; super_admin bypassa via service_role nelle API
- `chat_messaggi`: utente vede solo i messaggi della propria conversazione; super_admin bypassa via service_role

```sql
ALTER TABLE chat_conversazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messaggi      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utente_chat_conv" ON chat_conversazioni
  FOR ALL USING (utente_id = auth.uid());

CREATE POLICY "superadmin_chat_conv" ON chat_conversazioni
  FOR ALL USING (get_is_super_admin());

CREATE POLICY "utente_chat_msg" ON chat_messaggi
  FOR ALL USING (
    conversazione_id IN (
      SELECT id FROM chat_conversazioni WHERE utente_id = auth.uid()
    )
  );

CREATE POLICY "superadmin_chat_msg" ON chat_messaggi
  FOR ALL USING (
    get_is_super_admin()
  );
```

### Trigger `updated_at` su conversazioni
Aggiorna `chat_conversazioni.updated_at` ad ogni nuovo messaggio (per ordinare l'inbox per attività recente):
```sql
CREATE OR REPLACE FUNCTION chat_aggiorna_conv_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chat_conversazioni SET updated_at = now() WHERE id = NEW.conversazione_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_msg_aggiorna_conv
  AFTER INSERT ON chat_messaggi
  FOR EACH ROW EXECUTE FUNCTION chat_aggiorna_conv_updated_at();
```

### Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messaggi;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversazioni;
```

---

## 2. API Routes

### `GET/POST /api/chat/conversazione`
- `GET` — recupera la conversazione aperta dell'utente corrente (o null se non esiste)
- `POST` — crea una nuova conversazione aperta per l'utente (se non ne ha già una aperta)

### `GET /api/chat/messaggi?conversazione_id=<id>`
- Restituisce tutti i messaggi della conversazione, ordinati per `created_at ASC`
- Verifica che la conversazione appartenga all'utente corrente

### `POST /api/chat/messaggi`
```json
{ "conversazione_id": "uuid", "testo": "..." }
```
- Inserisce il messaggio con `mittente_id = user.id`
- Se il mittente NON è super_admin → invia email di notifica al super-admin via Resend

### `PATCH /api/chat/conversazione/[id]`
```json
{ "stato": "archiviata" }
```
- Archivia la conversazione; accessibile sia dall'utente proprietario che dal super-admin (service_role)

### `GET /api/super-admin/chat/conversazioni`
- Guard: `is_super_admin = true`
- Restituisce tutte le conversazioni di tutti i tenant, con join a `profiles` (nome, cognome, ruolo) e `tenants` (nome), e count messaggi non letti (`letto_superadmin = false`)
- Ordina per `updated_at DESC` (conversazioni con attività recente prima)

### `PATCH /api/super-admin/chat/messaggi/letti`
```json
{ "conversazione_id": "uuid" }
```
- Segna tutti i messaggi di una conversazione come `letto_superadmin = true`
- Chiamata quando il super-admin apre/seleziona una conversazione

---

## 3. Componenti

### `components/chat/ChatPanelSlide.tsx` (Client Component)
Il pannello slide laterale visibile in tutte le pagine autenticate.

**Struttura:**
- Tab fisso sul bordo destro: `💬 Aiuto` (rotated 90°, colore primario tenant o blu default)
- Click → pannello slide da destra (280px), sovrapposto al contenuto
- Pannello:
  - Header: "Supporto OperoHub" + pulsante chiudi
  - Area messaggi scrollabile con bolle (messaggi propri a destra in blu, risposte a sinistra in grigio)
  - Input + tasto invia
  - Link "Archivia conversazione" in fondo (visibile solo se conversazione aperta)
- Al mount: fetch `GET /api/chat/conversazione`; se null → non mostra messaggi, mostra testo "Scrivi per iniziare"
- Invio primo messaggio → chiama `POST /api/chat/conversazione` poi `POST /api/chat/messaggi`
- Realtime: si iscrive al canale `chat-conv-{conversazione_id}` su `chat_messaggi` per ricevere risposte live

### `components/chat/ChatMessage.tsx`
Singola bolla messaggio. Props: `testo`, `mittente` ('io' | 'altro'), `timestamp`.

### `app/super-admin/chat/page.tsx` (Client Component)
Inbox super-admin.

**Struttura:**
- Layout a due colonne: lista conversazioni (sinistra, 280px) + chat aperta (destra)
- Lista: ogni riga mostra `Nome Cognome · Nome Azienda · ruolo`, anteprima ultimo messaggio, timestamp, badge rosso con count non letti. Conversazioni archiviate collassate in fondo sotto separatore "Archiviate"
- Chat destra: header con nome + azienda + pulsante archivia (🗄); area messaggi; input risposta
- Selezione conversazione → chiama `PATCH /api/super-admin/chat/messaggi/letti`
- Realtime: canale `chat-superadmin` su `chat_messaggi` per ricevere nuovi messaggi da qualsiasi conversazione; suona un audio e aggiorna badge

### Notifiche super-admin in tempo reale
Quando arriva un messaggio da un utente (`letto_superadmin = false`):
1. **Badge** nella header del pannello super-admin (contatore non letti totale)
2. **Suono**: `new Audio('/sounds/chat-notification.mp3').play()` — file audio incluso nel progetto in `public/sounds/`
3. **Email Resend**: subject "Nuovo messaggio da [Nome] - [Azienda]", body con testo e link `/super-admin/chat`

---

## 4. Integrazione nei Layout

### `app/admin/layout.tsx`, `app/manager/layout.tsx`, `app/dipendente/layout.tsx`
Aggiungere `<ChatPanelSlide />` come ultimo elemento dentro `<main>` (posizionato in `fixed`, non influenza il layout).

```tsx
import { ChatPanelSlide } from '@/components/chat/ChatPanelSlide'
// ...
<main>
  {children}
  <ChatPanelSlide />
</main>
```

---

## 5. Navigazione Super-admin

Aggiungere link "Chat" nella header del layout super-admin (`app/super-admin/layout.tsx`) con badge non letti.

---

## 6. File da creare/modificare

| File | Azione |
|---|---|
| `supabase/migrations/031_chat.sql` | Crea — tabelle + RLS + realtime |
| `app/api/chat/conversazione/route.ts` | Crea — GET + POST |
| `app/api/chat/messaggi/route.ts` | Crea — GET + POST (con email notifica) |
| `app/api/chat/conversazione/[id]/route.ts` | Crea — PATCH archivia |
| `app/api/super-admin/chat/conversazioni/route.ts` | Crea — GET lista tutte |
| `app/api/super-admin/chat/messaggi/letti/route.ts` | Crea — PATCH segna letti |
| `components/chat/ChatMessage.tsx` | Crea |
| `components/chat/ChatPanelSlide.tsx` | Crea |
| `app/super-admin/chat/page.tsx` | Crea |
| `app/admin/layout.tsx` | Modifica — aggiunge `<ChatPanelSlide />` |
| `app/manager/layout.tsx` | Modifica — aggiunge `<ChatPanelSlide />` |
| `app/dipendente/layout.tsx` | Modifica — aggiunge `<ChatPanelSlide />` |
| `app/super-admin/layout.tsx` | Modifica — aggiunge link Chat con badge |
| `public/sounds/chat-notification.mp3` | Aggiunge — file audio notifica |
