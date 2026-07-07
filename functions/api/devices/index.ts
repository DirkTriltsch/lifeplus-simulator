import type { Env } from '../../env';
import { requireSession } from '../../_lib/auth';
import { getActiveDevices } from '../../_lib/db';
import { json, methodNotAllowed } from '../../_lib/responses';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  const ctx = await requireSession(request, env);
  if (ctx instanceof Response) return ctx;

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
