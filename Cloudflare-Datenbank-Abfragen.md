
Cloudflare Dashboard → Storage & Databases → D1 SQL Database → lifeflow360-prod → Console


SELECT
  u.email,
  datetime(u.created_at / 1000, 'unixepoch') AS created_at,
  e.access_level,
  datetime(e.valid_until / 1000, 'unixepoch') AS valid_until,
  CASE
    WHEN s.plan_id IS NOT NULL THEN s.plan_id
    WHEN e.source = 'trial' THEN 'trial'
    WHEN e.source = 'trial_expired' THEN 'trial_expired'
    WHEN e.source = 'free_signup' THEN 'free'
    WHEN e.source = 'beta_grace' THEN 'beta_grace'
    WHEN e.source = 'one_shot_purchase' THEN 'one_shot_purchase'
    WHEN e.source IS NOT NULL THEN e.source
    ELSE 'none'
  END AS chosen_plan,
  s.status AS subscription_status,
  s.plan_id,
  datetime(s.current_period_ends_at / 1000, 'unixepoch') AS current_period_ends_at
FROM users u
LEFT JOIN entitlements e ON e.user_id = u.id
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.deleted_at IS NULL
ORDER BY u.created_at DESC;