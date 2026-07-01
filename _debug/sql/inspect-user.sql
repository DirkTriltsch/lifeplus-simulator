-- Deep-Dive fuer eine einzelne Adresse (Sessions, Devices, Consent).
-- Vor Aufruf __EMAIL__ ersetzen ODER ueber PowerShell-Wrapper aufrufen.
-- Aufruf (Bash):  sed 's/__EMAIL__/test@example.com/' _debug/sql/inspect-user.sql | npx wrangler d1 execute lifeflow360-prod --remote --command "$(cat)"
-- Aufruf (Direkt): __EMAIL__ manuell ersetzen, dann --file verwenden.
SELECT u.id,
       u.email_lower,
       datetime(u.created_at/1000,'unixepoch') AS created,
       u.deleted_at,
       (SELECT COUNT(*) FROM sessions     WHERE user_id = u.id AND revoked_at IS NULL) AS active_sessions,
       (SELECT COUNT(*) FROM devices      WHERE user_id = u.id AND revoked_at IS NULL) AS active_devices,
       (SELECT COUNT(*) FROM entitlements WHERE user_id = u.id) AS entitlements,
       (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id) AS subscriptions
  FROM users u
 WHERE u.email_lower = '__EMAIL__';
