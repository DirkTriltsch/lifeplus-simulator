-- Drop legacy magic_login_tokens after the Email-OTP cut-over.
--
-- Magic-Link auth was replaced by 6-digit email OTP in 0010_email_otp.sql.
-- The Pages Function endpoints (request-link.ts, verify-link.ts) and the
-- mailer helper (sendMagicLink) have already been removed; no code path
-- writes to or reads from this table anymore.
--
-- Apply this only after the OTP migration has been verified in production.
-- The table can stay dropped; there is no rollback path that would need it,
-- because the old URL tokens cannot be converted into 6-digit codes.

DROP TABLE IF EXISTS magic_login_tokens;
