import type { Env } from '../../env';
import {
  clearedSessionCookieHeader,
  parseCookies,
  SESSION_COOKIE,
} from '../../_lib/cookies';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken, revokeDevice } from '../../_lib/session';
import { getActiveDevices } from '../../_lib/db';
import { nowMs } from '../../_lib/time';

interface Body {
  deviceId?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'unauthenticated');

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'unauthenticated');

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }
  const deviceId = (body.deviceId ?? '').trim();
  if (!deviceId) return error(400, 'missing_device_id');

  // Make sure the device belongs to this user.
  const owned = await env.DB.prepare(
    'SELECT id FROM devices WHERE id = ? AND user_id = ? AND revoked_at IS NULL LIMIT 1',
  )
    .bind(deviceId, ctx.user.id)
    .first<{ id: string }>();
  if (!owned) return error(404, 'device_not_found');

  await revokeDevice(env, deviceId);

  const isSelfRevoke = deviceId === ctx.device.id;
  const isFromDeviceLimitFlow = ctx.session.kind === 'device_limit_reached';

  if (isSelfRevoke && isFromDeviceLimitFlow) {
    return error(400, 'cannot_revoke_current_device_during_limit_flow');
  }

  // Case A: user revoked their own device -> log out and clear cookie.
  if (isSelfRevoke && !isFromDeviceLimitFlow) {
    return json(
      { ok: true, loggedOut: true },
      { headers: { 'set-cookie': clearedSessionCookieHeader(env) } },
    );
  }

  // Case B: user is in the device-limit reached flow and just freed a slot.
  // Promote the temporary session to a normal one for the same device.
  if (isFromDeviceLimitFlow) {
    const remaining = await getActiveDevices(env, ctx.user.id);
    if (remaining.length <= Number(env.DEVICE_LIMIT || '3')) {
      await env.DB.prepare('UPDATE sessions SET kind = ?, last_seen_at = ? WHERE id = ?')
        .bind('normal', nowMs(), ctx.session.id)
        .run();
      return json({ ok: true, promoted: true });
    }
  }

  return json({ ok: true });
};
