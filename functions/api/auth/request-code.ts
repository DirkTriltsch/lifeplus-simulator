import type { Env } from '../../env';
import { generateOtpCode, randomToken } from '../../_lib/crypto';
import { findUserByEmail } from '../../_lib/db';
import { createOtpToken, hashOtpCode } from '../../_lib/otpTokens';
import { bootstrapUserFromPaddle } from '../../_lib/paddleImport';
import { sendOtpCode } from '../../_lib/mailer';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { nowMs } from '../../_lib/time';

interface ConsentPayload {
  agb?: boolean;
  privacy?: boolean;
  newsletter?: boolean;
  version?: string;
  timestamp?: string;
}

interface Body {
  email?: string;
  access?: string;
  consent?: ConsentPayload;
  next?: string;
}

interface ConsentSnapshot {
  accepted_agb: 0 | 1;
  accepted_privacy: 0 | 1;
  newsletter_opt_in: 0 | 1;
  document_version: string;
  client_timestamp: string | null;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NEXT_URL_RX = /^\/checkout\/(monthly|halfyear|yearly)(?:\.html)?$/;

function sanitizeNextUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return NEXT_URL_RX.test(v) ? v : null;
}

function parseTtlMinutes(env: Env): number {
  const raw = env.OTP_TTL_MINUTES?.trim() || '15';
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid OTP_TTL_MINUTES: ${raw}`);
  return value;
}

function consentDocumentVersion(env: Env, consent: ConsentPayload): string {
  const version = consent.version?.trim() || env.CONSENT_DOCUMENT_VERSION?.trim();
  if (!version) throw new Error('CONSENT_DOCUMENT_VERSION not configured');
  return version;
}

async function performNeutralOtpWork(env: Env, now: number, request: Request): Promise<void> {
  const neutralEmail = `__neutral__:${crypto.randomUUID()}@invalid.local`;
  const neutralHash = await hashOtpCode(env, neutralEmail, randomToken(8));
  await createOtpToken(
    env,
    neutralEmail,
    neutralHash,
    'login',
    null,
    null,
    now + parseTtlMinutes(env) * 60_000,
    now,
    request,
  );
}

export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !EMAIL_RX.test(email) || email.length > 254) {
    return error(400, 'invalid_email');
  }

  const purpose = body.access === 'free' || (body.consent?.agb === true && body.consent?.privacy === true)
    ? 'free_signup'
    : 'login';

  let consentSnapshot: ConsentSnapshot | null = null;
  if (purpose === 'free_signup') {
    const consent = body.consent ?? {};
    if (consent.agb !== true || consent.privacy !== true) return error(400, 'consent_required');
    consentSnapshot = {
      accepted_agb: 1,
      accepted_privacy: 1,
      newsletter_opt_in: consent.newsletter === true ? 1 : 0,
      document_version: consentDocumentVersion(env, consent),
      client_timestamp: typeof consent.timestamp === 'string' ? consent.timestamp : null,
    };
  }

  const now = nowMs();
  const ip = clientIp(request);
  if (!ip) return error(429, 'rate_limited');
  const ipLimit = await consumeRateLimit(env, `rl:auth:request-code:ip:${ip}`, 5, 600, {
    failMode: 'open',
  });
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  if (purpose === 'login') {
    const accountFound =
      !!(await findUserByEmail(env, email)) ||
      await bootstrapUserFromPaddle(env, email, now);
    if (!accountFound) {
      await performNeutralOtpWork(env, now, request);
      return json({ ok: true });
    }
  }

  const emailLimit = await consumeRateLimit(env, `rl:auth:request-code:email:${email}`, 3, 1800, {
    failMode: 'open',
  });
  if (!emailLimit.allowed) {
    await performNeutralOtpWork(env, now, request);
    return json({ ok: true });
  }

  const code = generateOtpCode();
  const tokenHash = await hashOtpCode(env, email, code);
  await createOtpToken(
    env,
    email,
    tokenHash,
    purpose,
    consentSnapshot,
    sanitizeNextUrl(body.next),
    now + parseTtlMinutes(env) * 60_000,
    now,
    request,
  );

  const sendPromise = sendOtpCode(env, { to: email, code, purpose }).catch((err) => {
    console.error('[auth] failed to send OTP code', err);
  });
  if (waitUntil) waitUntil(sendPromise);
  else await sendPromise;

  if (
    env.DEV_OTP_DEBUG === '1' &&
    env.INSECURE_COOKIES === '1' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(env.APP_URL ?? '')
  ) {
    return json({ ok: true, dev_code: code });
  }
  return json({ ok: true });
};
