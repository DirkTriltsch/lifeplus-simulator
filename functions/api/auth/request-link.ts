import type { Env } from '../../env';
import { randomId, randomToken, sha256Hex } from '../../_lib/crypto';
import { findUserByEmail } from '../../_lib/db';
import { sendMagicLink } from '../../_lib/mailer';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { minutesFromNow, nowMs } from '../../_lib/time';

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
const DEFAULT_CONSENT_VERSION = '2026-06-01';

// Whitelist fuer next-URLs (Open-Redirect-Schutz).
// Erlaubt aktuell nur Pro-Checkout-Pfade: /checkout/{plan}.html
const NEXT_URL_RX = /^\/checkout\/(monthly|halfyear|yearly)(?:\.html)?$/;

function sanitizeNextUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return NEXT_URL_RX.test(v) ? v : null;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
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

  const hasFreeConsent =
    body.consent?.agb === true && body.consent?.privacy === true;
  const accessIntent = body.access === 'free' || hasFreeConsent ? 'free' : null;

  // Bei Free-Signup sind AGB + Datenschutz Pflicht (Frontend gating dupliziert
  // serverseitig, damit kein Magic-Link ohne Consent ausgestellt wird).
  let consentSnapshot: ConsentSnapshot | null = null;
  if (accessIntent === 'free') {
    const c = body.consent ?? {};
    if (c.agb !== true || c.privacy !== true) {
      return error(400, 'consent_required');
    }
    consentSnapshot = {
      accepted_agb: 1,
      accepted_privacy: 1,
      newsletter_opt_in: c.newsletter === true ? 1 : 0,
      document_version: typeof c.version === 'string' && c.version.length > 0
        ? c.version
        : DEFAULT_CONSENT_VERSION,
      client_timestamp: typeof c.timestamp === 'string' ? c.timestamp : null,
    };
  }

  let accountFound = false;
  if (accessIntent !== 'free') {
    accountFound = !!(await findUserByEmail(env, email));
    if (!accountFound) {
      return error(404, 'account_not_found');
    }
  }

  const ip = clientIp(request);
  const ipLimit = await consumeRateLimit(env, `rl:auth:request-link:ip:${ip}`, 5, 600);
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  const emailLimit = await consumeRateLimit(env, `rl:auth:request-link:email:${email}`, 3, 1800);
  // Even if email is over its limit, return neutral 200 so we don't leak existence.
  if (!emailLimit.allowed) {
    return json({ ok: true, accountFound });
  }

  const ttlMinutes = Number(env.MAGIC_LINK_TTL_MINUTES || '15');
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const id = randomId();
  const now = nowMs();
  const expires = minutesFromNow(ttlMinutes);

  const nextUrl = sanitizeNextUrl(body.next);

  await env.DB.prepare(
    `INSERT INTO magic_login_tokens
       (id, email_lower, token_hash, expires_at, created_at,
        request_ip, request_user_agent,
        access_intent, consent_payload_json, next_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      email,
      tokenHash,
      expires,
      now,
      ip,
      request.headers.get('user-agent')?.slice(0, 500) ?? null,
      accessIntent,
      consentSnapshot ? JSON.stringify(consentSnapshot) : null,
      nextUrl,
    )
    .run();

  const link =
    `${trimSlash(env.APP_URL)}/?token=${encodeURIComponent(token)}` +
    (accessIntent === 'free' ? '&access=free' : '');

  // Dev-Token-Helper: nur wenn BEIDE Env-Flags explizit gesetzt sind. Beide
  // gelten ausschliesslich via .dev.vars (lokales Dev). Production hat keine
  // dieser Vars gesetzt; selbst wenn RESEND_API_KEY ad-hoc fehlt, wird der
  // Klartext-Token nie zurueckgegeben.
  const isDevDebug =
    env.DEV_MAGIC_LINK_DEBUG === '1' && env.INSECURE_COOKIES === '1';

  try {
    await sendMagicLink(env, {
      to: email,
      link,
      brandName: env.MAIL_FROM_NAME || env.BRAND_ID,
      expiresInMinutes: ttlMinutes,
    });
  } catch (err) {
    if (isDevDebug) {
      console.log('[DEV] mailer not configured. Magic-Link token for', email, ':', token);
      console.log('[DEV] full link:', link);
      return json({ ok: true, dev_token: token, dev_link: link });
    }
    // Production: Mailer-Fehler → Token wieder loeschen, damit kein "toter"
    // Eintrag in der DB liegt. Rate-Limit hat den IP/Email-Counter bereits
    // konsumiert; das ist akzeptabel (verhindert Mail-Bombing bei Mailer-Outage).
    console.error('mailer_failed', err);
    try {
      await env.DB.prepare('DELETE FROM magic_login_tokens WHERE id = ?').bind(id).run();
    } catch (cleanupErr) {
      console.warn('mailer_cleanup_failed', cleanupErr);
    }
    return error(502, 'mail_send_failed');
  }

  return json({ ok: true, accountFound });
};

function trimSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
