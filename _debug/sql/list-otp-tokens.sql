-- Offene / gueltige OTP-Tokens einer Adresse.
-- Vor Aufruf __EMAIL__ ersetzen.
SELECT id,
       purpose,
       attempt_count,
       datetime(created_at/1000,'unixepoch') AS created,
       datetime(expires_at/1000,'unixepoch') AS expires,
       used_at IS NOT NULL AS used,
       request_ip
  FROM email_otp_tokens
 WHERE email_lower = '__EMAIL__'
 ORDER BY created_at DESC
 LIMIT 10;
