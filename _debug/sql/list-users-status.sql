-- Uebersicht aller User mit Entitlement- und Subscription-Status.
-- Aufruf: npx wrangler d1 execute lifeflow360-prod --remote --file _debug/sql/list-users-status.sql
SELECT u.email_lower,
       datetime(u.created_at/1000,'unixepoch') AS created,
       CASE WHEN u.deleted_at IS NULL THEN 'active' ELSE 'deleted' END AS user_status,
       e.access_level,
       datetime(e.valid_until/1000,'unixepoch') AS valid_until,
       s.status  AS sub_status,
       s.plan_id AS plan
  FROM users u
  LEFT JOIN entitlements e  ON e.user_id = u.id
  LEFT JOIN subscriptions s ON s.user_id = u.id AND s.canceled_at IS NULL
 ORDER BY u.created_at DESC
 LIMIT 50;
