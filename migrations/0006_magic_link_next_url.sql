-- Phase 3.5 — Magic-Link-Redirect-Ziel.
--
-- Wenn ein anonymer User auf einen Pro-Checkout-CTA klickt, kommt er auf
-- /signup?next=/checkout/{plan}. Der next-Pfad wird am Magic-Link-Token
-- persistiert; verify-link liefert ihn dem Frontend nach erfolgreichem
-- Login zurueck, damit es zur Pro-Page weiterleiten kann (statt default /app).
--
-- Whitelist-Validierung passiert in request-link.ts — nur /checkout/{plan}-
-- Pfade werden gespeichert; alles andere wird verworfen (Open-Redirect-Schutz).

ALTER TABLE magic_login_tokens ADD COLUMN next_url TEXT;
