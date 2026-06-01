-- Phase 2-Review Fix #6 — Client-Timestamp am Consent persistieren.
--
-- created_at (server-time) bleibt authoritative. client_timestamp_iso ist die
-- Zeitangabe, die der Browser zum Zeitpunkt der Zustimmung an den Server
-- geschickt hat — nuetzlich fuer spaetere Audits ("welche Uhrzeit sah der
-- Nutzer auf seinem Geraet, als er die Checkbox angeklickt hat").
-- Format: ISO-8601-String (z.B. "2026-06-01T10:23:45.000Z"), nullable.

ALTER TABLE consent_log ADD COLUMN client_timestamp_iso TEXT;
