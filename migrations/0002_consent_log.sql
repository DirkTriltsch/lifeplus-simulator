-- Phase 1.1 — Consent-Audit-Tabelle.
--
-- Append-only Log aller Zustimmungen (AGB, Datenschutz, Widerrufsverzicht,
-- Newsletter) — sowohl Free-Signup als auch Pro-Checkout. Einzige
-- Quelle der Wahrheit fuer "was wurde wann mit welcher Version
-- bestaetigt".
--
-- Identitaetsregel (siehe _doc/paddle_checkout/Umsetzungsplan.md):
--   checkout_user_id  = User, der Zugang/Kauf bekommt
--   session_user_id   = eingeloggter Initiator (nullable, Audit)
--   checkout_email    = Email zum Zeitpunkt der Zustimmung (immutable Snapshot)
--   session_email     = Session-Email zum Zeitpunkt der Zustimmung (Audit)
--
-- Bei pro_checkout MUSS checkout_email == session_email gelten (Identitaetsregel).
-- Bei free_signup gibt es initial keine Session — session_* bleiben NULL.

CREATE TABLE IF NOT EXISTS consent_log (
  id TEXT PRIMARY KEY,
  checkout_user_id TEXT NOT NULL,
  session_user_id TEXT,
  checkout_email TEXT NOT NULL,
  session_email TEXT,
  brand_id TEXT NOT NULL,
  context TEXT NOT NULL,                                    -- 'free_signup' | 'pro_checkout'
  accepted_agb INTEGER NOT NULL,                            -- 0 | 1
  accepted_privacy INTEGER NOT NULL,                        -- 0 | 1
  accepted_withdrawal_waiver INTEGER NOT NULL DEFAULT 0,    -- 0 | 1 (free_signup immer 0)
  newsletter_opt_in INTEGER NOT NULL DEFAULT 0,             -- 0 | 1
  document_version TEXT NOT NULL,                           -- z.B. '2026-06-01'
  paddle_transaction_id TEXT,                               -- nur bei pro_checkout
  paddle_subscription_id TEXT,                              -- nur bei pro_checkout
  request_ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,                              -- ms-since-epoch
  FOREIGN KEY (checkout_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS consent_log_user ON consent_log(checkout_user_id, brand_id);
CREATE INDEX IF NOT EXISTS consent_log_newsletter ON consent_log(newsletter_opt_in, created_at);
CREATE INDEX IF NOT EXISTS consent_log_paddle_sub ON consent_log(paddle_subscription_id);
