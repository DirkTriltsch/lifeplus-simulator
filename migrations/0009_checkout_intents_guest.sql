-- v6.1 Gast-Checkout: user_id im checkout_intents wird nullable.
--
-- Hintergrund: Pricing-CTAs gehen direkt auf /checkout/{plan}.html, ohne
-- Magic-Link-Detour. Der Kunde fuellt im Checkout Email + Rechnungsdaten ein,
-- bezahlt, und im post-checkout legen wir User + Session an. Beim Anlegen des
-- Intents ist daher der user_id noch nicht bekannt. Erst beim Auto-Login nach
-- Paddle-Bestaetigung (oder via Webhook) wird die Verbindung hergestellt.
--
-- SQLite/D1 erlaubt kein direktes "ALTER COLUMN DROP NOT NULL". Standardweg
-- ist Tabelle neu anlegen, Daten kopieren, alte verwerfen, neue umbenennen.

CREATE TABLE checkout_intents_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,                                        -- jetzt nullable (Gast-Checkout)
  brand_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  price_id TEXT NOT NULL,
  checkout_email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  consumed_paddle_subscription_id TEXT,
  consumed_paddle_transaction_id TEXT,
  company_name TEXT,
  street TEXT,
  postal_code TEXT,
  city TEXT,
  country_code TEXT,
  discount_code TEXT,
  vat_id TEXT,
  b2b_confirmation_version TEXT,
  displayed_hints_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  paddle_transaction_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO checkout_intents_new
  SELECT id, user_id, brand_id, plan, price_id, checkout_email,
         created_at, expires_at,
         consumed_at, consumed_paddle_subscription_id, consumed_paddle_transaction_id,
         company_name, street, postal_code, city, country_code,
         discount_code, vat_id,
         b2b_confirmation_version, displayed_hints_hash,
         ip_address, user_agent,
         paddle_transaction_id
    FROM checkout_intents;

DROP TABLE checkout_intents;

ALTER TABLE checkout_intents_new RENAME TO checkout_intents;

CREATE INDEX IF NOT EXISTS checkout_intents_user ON checkout_intents(user_id, brand_id);
CREATE INDEX IF NOT EXISTS checkout_intents_expires ON checkout_intents(expires_at);
CREATE INDEX IF NOT EXISTS checkout_intents_email ON checkout_intents(checkout_email);
