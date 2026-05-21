import type { Env } from '../../env';
import { randomId, randomToken, sha256Hex } from '../../_lib/crypto';
import { sendMagicLink } from '../../_lib/mailer';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { minutesFromNow, nowMs } from '../../_lib/time';

interface Body {
  email?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

  const ip = clientIp(request);
  const ipLimit = await consumeRateLimit(env, `rl:auth:request-link:ip:${ip}`, 5, 600);
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  const emailLimit = await consumeRateLimit(env, `rl:auth:request-link:email:${email}`, 3, 1800);
  // Even if email is over its limit, return neutral 200 so we don't leak existence.
  if (!emailLimit.allowed) {
    return json({ ok: true });
  }

  const ttlMinutes = Number(env.MAGIC_LINK_TTL_MINUTES || '15');
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const id = randomId();
  const now = nowMs();
  const expires = minutesFromNow(ttlMinutes);

  await env.DB.prepare(
    `INSERT INTO magic_login_tokens
       (id, email_lower, token_hash, expires_at, created_at, request_ip, request_user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      email,
      tokenHash,
      expires,
      now,
      ip,
      request.headers.get('user-agent')?.slice(0, 500) ?? null,
    )
    .run();

  const link = `${trimSlash(env.APP_URL)}/?token=${encodeURIComponent(token)}`;
  try {
    await sendMagicLink(env, {
      to: email,
      link,
      brandName: env.MAIL_FROM_NAME || env.BRAND_ID,
      expiresInMinutes: ttlMinutes,
    });
  } catch (err) {
    console.error('mailer_failed', err);
    return error(502, 'mail_send_failed');
  }

  return json({ ok: true });
};

function trimSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
