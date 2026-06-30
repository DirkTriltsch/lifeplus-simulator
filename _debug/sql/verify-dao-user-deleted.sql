-- Verification for dao@triltsch-online.de cleanup.
-- 1) All rows with the deleted email must be 0.
SELECT 'target_email_counts' AS section, 'users' AS table_name, COUNT(*) AS remaining
  FROM users
 WHERE email_lower = 'dao@triltsch-online.de'
UNION ALL
SELECT 'target_email_counts', 'checkout_intents', COUNT(*)
  FROM checkout_intents
 WHERE lower(checkout_email) = 'dao@triltsch-online.de'
UNION ALL
SELECT 'target_email_counts', 'consent_log', COUNT(*)
  FROM consent_log
 WHERE lower(checkout_email) = 'dao@triltsch-online.de'
    OR lower(COALESCE(session_email, '')) = 'dao@triltsch-online.de'
UNION ALL
SELECT 'target_email_counts', 'magic_login_tokens', COUNT(*)
  FROM magic_login_tokens
 WHERE email_lower = 'dao@triltsch-online.de'
UNION ALL
SELECT 'target_email_counts', 'email_otp_active', COUNT(*)
  FROM email_otp_active
 WHERE email_lower = 'dao@triltsch-online.de'
UNION ALL
SELECT 'target_email_counts', 'email_otp_tokens', COUNT(*)
  FROM email_otp_tokens
 WHERE email_lower = 'dao@triltsch-online.de'
UNION ALL
SELECT 'target_email_counts', 'webhook_events_payload', COUNT(*)
  FROM webhook_events
 WHERE lower(payload_json) LIKE '%dao@triltsch-online.de%';

-- 2) Remaining users with row counts in related tables.
-- The deleted email must not appear here; only other users should be listed.
SELECT
  'remaining_users' AS section,
  u.email_lower,
  COUNT(DISTINCT s.id)  AS sessions,
  COUNT(DISTINCT d.id)  AS devices,
  COUNT(DISTINCT e.id)  AS entitlements,
  COUNT(DISTINCT sub.id) AS subscriptions,
  COUNT(DISTINCT ci.id) AS checkout_intents,
  COUNT(DISTINCT cl.id) AS consent_logs
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id
LEFT JOIN devices d ON d.user_id = u.id
LEFT JOIN entitlements e ON e.user_id = u.id
LEFT JOIN subscriptions sub ON sub.user_id = u.id
LEFT JOIN checkout_intents ci ON ci.user_id = u.id
LEFT JOIN consent_log cl ON cl.checkout_user_id = u.id OR cl.session_user_id = u.id
GROUP BY u.id, u.email_lower
ORDER BY u.email_lower;
