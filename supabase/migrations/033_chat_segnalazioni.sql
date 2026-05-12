-- Aggiunge titolo alle conversazioni e rimuove il vincolo una-sola-aperta
ALTER TABLE chat_conversazioni ADD COLUMN titolo TEXT;

-- Rimuove il vincolo che permetteva una sola conversazione aperta per utente
DROP INDEX IF EXISTS chat_conv_utente_aperta;
