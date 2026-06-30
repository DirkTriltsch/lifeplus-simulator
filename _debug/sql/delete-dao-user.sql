-- Hard delete one test user from the LifeFlow360 backend.
-- Intended for test cleanup only.
-- D1/wrangler blocks explicit transactions and temp tables in SQL files, so
-- every delete uses direct subqueries while the user row still exists.
-- Placeholder __EMAIL_TO_DELETE__ is replaced by _debug/delete-dao-user.ps1.

DELETE FROM sessions
 WHERE user_id IN (
        SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
      )
    OR device_id IN (
      SELECT id FROM devices
       WHERE user_id IN (
         SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
       )
    );

DELETE FROM devices
 WHERE user_id IN (
   SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
 );

DELETE FROM entitlements
 WHERE user_id IN (
   SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
 );

DELETE FROM subscriptions
 WHERE user_id IN (
   SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
 );

DELETE FROM checkout_intents
 WHERE user_id IN (
        SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
      )
    OR lower(checkout_email) = '__EMAIL_TO_DELETE__';

DELETE FROM consent_log
 WHERE checkout_user_id IN (
        SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
      )
    OR session_user_id IN (
        SELECT id FROM users WHERE email_lower = '__EMAIL_TO_DELETE__'
      )
    OR lower(checkout_email) = '__EMAIL_TO_DELETE__'
    OR lower(COALESCE(session_email, '')) = '__EMAIL_TO_DELETE__';

DELETE FROM magic_login_tokens
 WHERE email_lower = '__EMAIL_TO_DELETE__';

DELETE FROM email_otp_active
 WHERE email_lower = '__EMAIL_TO_DELETE__';

DELETE FROM email_otp_tokens
 WHERE email_lower = '__EMAIL_TO_DELETE__';

-- Webhook payloads can contain checkout/customer email snapshots. For this
-- explicit test-user wipe we remove payload rows that still contain the email.
DELETE FROM webhook_events
 WHERE lower(payload_json) LIKE '%__EMAIL_TO_DELETE__%';

DELETE FROM users
 WHERE email_lower = '__EMAIL_TO_DELETE__';
