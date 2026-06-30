-- Numeric email OTP authentication.
-- New tables are additive; legacy magic_login_tokens stays until the cut-over
-- has been verified and can be dropped in a follow-up migration.

CREATE TABLE IF NOT EXISTS email_otp_tokens (
  id TEXT PRIMARY KEY,
  email_lower TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login','free_signup')),
  consent_payload_json TEXT,
  next_url TEXT,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  request_ip TEXT,
  request_user_agent TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS email_otp_active (
  email_lower TEXT PRIMARY KEY,
  active_token_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS email_otp_tokens_email ON email_otp_tokens(email_lower);
CREATE INDEX IF NOT EXISTS email_otp_tokens_open ON email_otp_tokens(email_lower, used_at, expires_at, created_at);
