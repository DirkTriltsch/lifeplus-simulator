import type { Env } from '../env';
import { parseCookies, SESSION_COOKIE } from '../_lib/cookies';
import {
  degradeExpiredTrial,
  findUserById,
  getActiveDevices,
  getEntitlementForBrand,
  isEntitlementActive,
} from '../_lib/db';
import { error, json, methodNotAllowed } from '../_lib/responses';
import { loadSessionFromToken } from '../_lib/session';
import { nowMs } from '../_lib/time';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return json({
      authenticated: false,
      entitlements: [],
      deviceLimit: Number(env.DEVICE_LIMIT || '3'),
      activeDevices: 0,
    });
  }

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) {
    return json({
      authenticated: false,
      entitlements: [],
      deviceLimit: Number(env.DEVICE_LIMIT || '3'),
      activeDevices: 0,
    });
  }

  const user = await findUserById(env, ctx.user.id);
  if (!user) return error(500, 'user_missing');

  const now = nowMs();
  const rawEntitlement = await getEntitlementForBrand(env, user.id, env.BRAND_ID);
  // Lazy-Trial-Degradierung: abgelaufene Trials kommen hier auf
  // access_level='free' / source='trial_expired'. Idempotent + Race-safe.
  const entitlement = await degradeExpiredTrial(env, rawEntitlement, now);
  const devices = await getActiveDevices(env, user.id);

  return json({
    authenticated: true,
    sessionKind: ctx.session.kind,
    email: user.email,
    brand: env.BRAND_ID,
    entitlements: entitlement
      ? [
          {
            brand: entitlement.brand_id,
            plan: entitlement.access_level,
            active: isEntitlementActive(entitlement, now),
            validUntil: entitlement.valid_until,
            source: entitlement.source,
          },
        ]
      : [],
    deviceLimit: Number(env.DEVICE_LIMIT || '3'),
    activeDevices: devices.length,
  });
};
