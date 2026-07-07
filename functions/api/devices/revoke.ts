import type { Env } from '../../env';
import { requireSession } from '../../_lib/auth';
import {
  clearedSessionCookieHeader,
} from '../../_lib/cookies';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { revokeDevice } from '../../_lib/session';
import { getActiveDevices } from '../../_lib/db';
import { nowMs } from '../../_lib/time';

interface Body {
  deviceId?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const ctx = await requireSession(request, env);
  if (ctx instanceof Response) return ctx;

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

  const isSelfRevoke = deviceId === ctx.device.id;
  const isFromDeviceLimitFlow = ctx.session.kind === 'device_limit_reached';

  if (isSelfRevoke && isFromDeviceLimitFlow) {
    return error(400, 'cannot_revoke_current_device_during_limit_flow');
  }

  await revokeDevice(env, deviceId);

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
