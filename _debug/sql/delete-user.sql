-- Hard-Delete des Users 'dao@triltsch-online.de' inkl. aller Spuren.
-- Aufruf:
--   npx wrangler d1 execute lifeflow360-prod --remote --file _debug/sql/delete-user.sql
--   npx wrangler d1 execute lifeflow360-prod --local  --file _debug/sql/delete-user.sql
--
-- Variante mit Consent-Audit-Erhalt: die DELETE-Zeile fuer consent_log
-- auskommentieren (Audit-Trail bleibt fuer Buchhaltung erhalten).

DELETE FROM sessions          WHERE user_id IN (SELECT id FROM users WHERE email_lower = 'dao@triltsch-online.de');
DELETE FROM devices           WHERE user_id IN (SELECT id FROM users WHERE email_lower = 'dao@triltsch-online.de');
DELETE FROM entitlements      WHERE user_id IN (SELECT id FROM users WHERE email_lower = 'dao@triltsch-online.de');
DELETE FROM subscriptions     WHERE user_id IN (SELECT id FROM users WHERE email_lower = 'dao@triltsch-online.de');
DELETE FROM consent_log       WHERE checkout_user_id IN (SELECT id FROM users WHERE email_lower = 'dao@triltsch-online.de');
DELETE FROM checkout_intents  WHERE user_id IN (SELECT id FROM users WHERE email_lower = 'dao@triltsch-online.de');
DELETE FROM magic_login_tokens WHERE email_lower = 'dao@triltsch-online.de';
DELETE FROM users             WHERE email_lower = 'dao@triltsch-online.de';
