-- Erweitert consent_log um B2B-Bestaetigungs-Felder.
-- Vorher (0002_consent_log.sql) hatte das consent_log nur AGB + Privacy +
-- Widerrufsverzicht + Newsletter. Mit dem B2B-Pivot (v6) entfaellt der
-- Widerrufsverzicht zwar UI-seitig im Pro-Checkout, das Feld bleibt aber im
-- Schema fuer Bestandsdaten + Free-Plan-Faelle.
--
-- Neu:
--   - b2b_confirmation: ob der Kaeufer die Unternehmer-Erklaerung gesetzt hat
--   - b2b_confirmation_version: Versionsstring des Wordings (Audit)
--   - displayed_hints_hash: Hash der zur Anzeige gebrachten B2B-Hinweise
--
-- Quelle der Werte ist die im checkout_intents gespeicherte Bestaetigung
-- (siehe migrations/0007_checkout_intents_b2b.sql). Der Webhook liest die
-- Felder beim Persistieren des consent_log aus dem Intent.

ALTER TABLE consent_log ADD COLUMN b2b_confirmation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE consent_log ADD COLUMN b2b_confirmation_version TEXT;
ALTER TABLE consent_log ADD COLUMN displayed_hints_hash TEXT;
