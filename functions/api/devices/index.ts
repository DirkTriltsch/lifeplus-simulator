import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { getActiveDevices } from '../../_lib/db';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'unauthenticated');

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'unauthenticated');

  const devices = await getActiveDevices(env, ctx.user.id);

  return json({
    deviceLimit: Number(env.DEVICE_LIMIT || '3'),
    currentDeviceId: ctx.device.id,
    devices: devices.map((d) => ({
      id: d.id,
      label: d.label ?? 'Unbekanntes Geraet',
      lastSeenAt: d.last_seen_at,
      firstSeenAt: d.first_seen_at,
      isCurrent: d.id === ctx.device.id,
    })),
  });
};
