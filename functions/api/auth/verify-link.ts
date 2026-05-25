import type { Env } from '../../env';
import { sessionCookieHeader } from '../../_lib/cookies';
import { randomId, sha256Hex } from '../../_lib/crypto';
import { getActiveDevices, grantFreeEntitlementIfMissing, upsertUserByEmail } from '../../_lib/db';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { createSessionForNewDevice } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

interface Body {
  token?: string;
  access?: string;
}

interface TokenRow {
  id: string;
  email_lower: string;
  token_hash: string;
  expires_at: number;
  used_at: number | null;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const token = (body.token ?? '').trim();
  if (!token || token.length < 16 || token.length > 200) {
    return error(400, 'invalid_token');
  }

  const ip = clientIp(request);
  const limit = await consumeRateLimit(env, `rl:auth:verify-link:ip:${ip}`, 10, 600);
  if (!limit.allowed) return error(429, 'rate_limited');

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    'SELECT id, email_lower, token_hash, expires_at, used_at FROM magic_login_tokens WHERE token_hash = ? LIMIT 1',
  )
    .bind(tokenHash)
    .first<TokenRow>();

  if (!row) return error(400, 'invalid_token');
  if (row.used_at !== null) return error(400, 'token_used');
  if (row.expires_at < nowMs()) return error(400, 'token_expired');

  // Mark as used immediately to prevent replay.
  const markResult = await env.DB.prepare(
    'UPDATE magic_login_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL',
  )
    .bind(nowMs(), row.id)
    .run();

  const markedRows = markResult.meta?.changes ?? 0;
  if (markedRows === 0) return error(400, 'token_used');

  const user = await upsertUserByEmail(env, row.email_lower, nowMs(), randomId);
  if (body.access === 'free') {
    await grantFreeEntitlementIfMissing(env, user.id, env.BRAND_ID, nowMs(), randomId);
  }

  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;
  const devices = await getActiveDevices(env, user.id);
  const deviceLimit = Number(env.DEVICE_LIMIT || '3');
  const wouldExceed = devices.length >= deviceLimit;

  const session = await createSessionForNewDevice(env, {
    userId: user.id,
    userAgent,
    kind: wouldExceed ? 'device_limit_reached' : 'normal',
  });

  const cookie = sessionCookieHeader(
    env,
    session.sessionToken,
    Math.max(60, Math.floor((session.expiresAt - nowMs()) / 1000)),
  );

  return json(
    {
      ok: true,
      sessionKind: session.kind,
      email: user.email,
    },
    { headers: { 'set-cookie': cookie } },
  );
};
