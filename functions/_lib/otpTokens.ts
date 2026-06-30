import type { Env } from '../env';
import { hmacSha256Hex, randomId } from './crypto';

const MAX_ATTEMPTS = 5;

export type OtpPurpose = 'login' | 'free_signup';

export interface OtpTokenRow {
  id: string;
  email_lower: string;
  purpose: OtpPurpose;
  consent_payload_json: string | null;
  next_url: string | null;
}

interface ActiveOtpTokenRow extends OtpTokenRow {
  token_hash: string;
  expires_at: number;
  used_at: number | null;
  attempt_count: number;
}

export type ConsumeOtpResult =
  | ({ status: 'ok' } & OtpTokenRow)
  | { status: 'invalid' }
  | { status: 'locked' };

export async function createOtpToken(
  env: Env,
  emailLower: string,
  tokenHash: string,
  purpose: OtpPurpose,
  consentPayload: unknown,
  nextUrl: string | null,
  expiresAt: number,
  now: number,
  request: Request,
): Promise<void> {
  const id = randomId();
  const previousActive = await env.DB.prepare(
    'SELECT active_token_id FROM email_otp_active WHERE email_lower = ?',
  ).bind(emailLower).first<{ active_token_id: string }>();

  const statements = [
    env.DB.prepare(
      `INSERT INTO email_otp_tokens
         (id,email_lower,token_hash,purpose,consent_payload_json,next_url,expires_at,created_at,request_ip,request_user_agent,attempt_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    ).bind(
      id,
      emailLower,
      tokenHash,
      purpose,
      consentPayload ? JSON.stringify(consentPayload) : null,
      nextUrl,
      expiresAt,
      now,
      request.headers.get('cf-connecting-ip'),
      request.headers.get('user-agent')?.slice(0, 500) ?? null,
    ),
    env.DB.prepare(
      `INSERT INTO email_otp_active (email_lower, active_token_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(email_lower) DO UPDATE SET
         active_token_id = excluded.active_token_id,
         updated_at = excluded.updated_at`,
    ).bind(emailLower, id, now),
  ];

  if (previousActive?.active_token_id && previousActive.active_token_id !== id) {
    statements.push(
      env.DB.prepare(
        `UPDATE email_otp_tokens
            SET used_at = ?
          WHERE id = ?
            AND email_lower = ?
            AND used_at IS NULL`,
      ).bind(now, previousActive.active_token_id, emailLower),
    );
  }

  await env.DB.batch(statements);
}

export async function consumeOtpToken(
  env: Env,
  emailLower: string,
  code: string,
  now: number,
): Promise<ConsumeOtpResult> {
  const tokenHash = await hashOtpCode(env, emailLower, code);

  const active = await env.DB.prepare(
    `SELECT t.id,t.email_lower,t.token_hash,t.purpose,t.consent_payload_json,
            t.next_url,t.expires_at,t.used_at,t.attempt_count
       FROM email_otp_tokens t
       JOIN email_otp_active a
         ON a.email_lower = t.email_lower
        AND a.active_token_id = t.id
      WHERE t.email_lower = ?
      LIMIT 1`,
  ).bind(emailLower).first<ActiveOtpTokenRow>();
  if (!active || active.expires_at <= now) {
    return { status: 'invalid' };
  }

  if (
    active.used_at !== null &&
    active.token_hash === tokenHash &&
    active.attempt_count >= MAX_ATTEMPTS
  ) {
    return { status: 'locked' };
  }

  if (active.used_at !== null) return { status: 'invalid' };

  const matchingInactive = await env.DB.prepare(
    `SELECT id
       FROM email_otp_tokens
      WHERE email_lower = ?
        AND token_hash = ?
        AND used_at IS NOT NULL
        AND id <> COALESCE((SELECT active_token_id FROM email_otp_active WHERE email_lower = ?), '')
      LIMIT 1`,
  ).bind(emailLower, tokenHash, emailLower).first<{ id: string }>();
  if (matchingInactive) return { status: 'invalid' };

  if (active.token_hash === tokenHash && active.attempt_count >= MAX_ATTEMPTS) {
    return { status: 'locked' };
  }

  if (active.token_hash === tokenHash) {
    const claimResult = await env.DB.prepare(
      `UPDATE email_otp_tokens
          SET used_at = ?
        WHERE id = ?
          AND used_at IS NULL
          AND attempt_count < ?`,
    ).bind(now, active.id, MAX_ATTEMPTS).run();

    if ((claimResult.meta?.changes ?? 0) !== 1) return { status: 'invalid' };
    return {
      status: 'ok',
      id: active.id,
      email_lower: active.email_lower,
      purpose: active.purpose,
      consent_payload_json: active.consent_payload_json,
      next_url: active.next_url,
    };
  }

  const wrongAttempt = await env.DB.prepare(
    `UPDATE email_otp_tokens
        SET attempt_count = attempt_count + 1
      WHERE id = ?
        AND token_hash <> ?
        AND used_at IS NULL
        AND expires_at > ?
        AND attempt_count < ?`,
  ).bind(active.id, tokenHash, now, MAX_ATTEMPTS).run();

  if ((wrongAttempt.meta?.changes ?? 0) === 1) {
    await env.DB.prepare(
      `UPDATE email_otp_tokens
          SET used_at = ?
        WHERE id = (
          SELECT t.id
            FROM email_otp_tokens t
            JOIN email_otp_active a
              ON a.email_lower = t.email_lower
             AND a.active_token_id = t.id
           WHERE t.email_lower = ?
             AND t.used_at IS NULL
             AND t.expires_at > ?
             AND t.attempt_count >= ?
           LIMIT 1
        )
          AND used_at IS NULL`,
    ).bind(now, emailLower, now, MAX_ATTEMPTS).run();

    return { status: 'invalid' };
  }
  return { status: 'invalid' };
}

export function otpHashSecret(env: Env): string {
  return env.OTP_HASH_SECRET || env.APP_SESSION_SECRET;
}

export function otpHashInput(emailLower: string, code: string): string {
  return `${emailLower}:${code}`;
}

export function hashOtpCode(env: Env, emailLower: string, code: string): Promise<string> {
  return hmacSha256Hex(otpHashSecret(env), otpHashInput(emailLower, code));
}
