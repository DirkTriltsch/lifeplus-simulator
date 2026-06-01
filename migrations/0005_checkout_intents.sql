-- Phase 2-Review Fix: Serverseitiger Checkout-Intent.
--
-- Verhindert "kein Kauf fuer fremde Email"-Bypass via manipuliertem
-- Paddle-customData. Der Webhook validiert beim Eintreffen die intent_id
-- aus customData gegen diese Tabelle und nimmt user_id + checkout_email
-- aus dem Server-Eintrag, nicht aus dem ungeschuetzten Paddle-Payload.
--
-- Lifecycle:
--   1. POST /api/billing/checkout-intent erzeugt einen Eintrag (start_checkout)
--   2. Frontend reicht intent_id in customData ans Paddle weiter
--   3. Webhook ruft consumed_at = now beim ersten Event (subscription.created)
--   4. Bei Idempotenz-Retries findet der Webhook consumed_at != NULL und
--      vertraut weiterhin dem persistierten user_id/checkout_email.
--   5. Abgelaufene Intents (expires_at < now, consumed_at IS NULL) koennen
--      per Cron oder ad-hoc geloescht werden — sie sind nicht mehr nutzbar.

CREATE TABLE IF NOT EXISTS checkout_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  plan TEXT NOT NULL,                                  -- 'monthly' | 'halfyear' | 'yearly'
  price_id TEXT NOT NULL,                              -- pri_...
  checkout_email TEXT NOT NULL,                        -- == session.email zum Zeitpunkt der Intent-Erstellung
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,                         -- created_at + 30min
  consumed_at INTEGER,                                 -- Webhook setzt das beim ersten Match
  consumed_paddle_subscription_id TEXT,                -- Audit: welcher Paddle-Event hat konsumiert?
  consumed_paddle_transaction_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS checkout_intents_user ON checkout_intents(user_id, brand_id);
CREATE INDEX IF NOT EXISTS checkout_intents_expires ON checkout_intents(expires_at);
