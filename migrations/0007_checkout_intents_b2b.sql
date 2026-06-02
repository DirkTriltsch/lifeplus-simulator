-- B2B-Pivot des Pro-Checkouts (siehe
-- _doc/paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md, Stand v6).
--
-- Erweitert checkout_intents um:
--   - Rechnungsempfaenger-Daten (company_name, street, postal_code, city,
--     country_code) — Pflicht im v6-Checkout fuer eine saubere Rechnung und
--     korrekte Paddle-Steuerbehandlung.
--   - Paddle-Transaktion-Audit (discount_code, vat_id, paddle_transaction_id)
--     — der Webhook validiert spaeter Transaction-ID-Match.
--   - Beweislast-Logging zur B2B-Bestaetigung (b2b_confirmation_version,
--     displayed_hints_hash, ip_address, user_agent) — siehe
--     lifeplus_checkout_legal_review_B2B_only.md Finding 7.
--
-- Alle Spalten nullable, damit bestehende Rows aus 0005 keine Default-Werte
-- brauchen. Neue Rows werden vom Backend immer mit company_name + Adress-
-- Quartett + b2b_confirmation_* befuellt; paddle_transaction_id wird gesetzt,
-- sobald die Paddle-API die Transaction erstellt hat.

ALTER TABLE checkout_intents ADD COLUMN company_name TEXT;
ALTER TABLE checkout_intents ADD COLUMN street TEXT;
ALTER TABLE checkout_intents ADD COLUMN postal_code TEXT;
ALTER TABLE checkout_intents ADD COLUMN city TEXT;
ALTER TABLE checkout_intents ADD COLUMN country_code TEXT;
ALTER TABLE checkout_intents ADD COLUMN discount_code TEXT;
ALTER TABLE checkout_intents ADD COLUMN vat_id TEXT;
ALTER TABLE checkout_intents ADD COLUMN b2b_confirmation_version TEXT;
ALTER TABLE checkout_intents ADD COLUMN displayed_hints_hash TEXT;
ALTER TABLE checkout_intents ADD COLUMN ip_address TEXT;
ALTER TABLE checkout_intents ADD COLUMN user_agent TEXT;
ALTER TABLE checkout_intents ADD COLUMN paddle_transaction_id TEXT;
