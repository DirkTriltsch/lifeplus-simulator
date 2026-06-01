-- Phase 1.2 — Magic-Link Consent-Payload.
--
-- Erweitert magic_login_tokens um zwei Felder, damit Free-Signup
-- (Option A: Consent vor Login) sauber funktioniert:
--
--   access_intent        — 'free' fuer Free-Signup-Flow (→ Trial bei verify-link).
--                          NULL = normaler Login (kein Trial-Trigger).
--   consent_payload_json — JSON-Blob mit AGB/Datenschutz/Newsletter zum
--                          Zeitpunkt des Signups. Wird beim Magic-Link-Klick
--                          aus dem Token gelesen und in consent_log persistiert.
--
-- Beide Felder sind nullable und brechen keinen bestehenden Login-Flow.

ALTER TABLE magic_login_tokens ADD COLUMN access_intent TEXT;
ALTER TABLE magic_login_tokens ADD COLUMN consent_payload_json TEXT;
