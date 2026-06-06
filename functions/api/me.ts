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

// Mapt eine Paddle-Price-ID auf die Laufzeit-Bezeichnung, die wir auf
// "Mein Konto" anzeigen ("1 Monat" / "6 Monate" / "1 Jahr"). Liefert null,
// wenn die Price-ID zu keinem konfigurierten Plan passt (z.B. Bestandsabos
// mit veraendertem Preis-Setup oder Trial-/Free-Entitlements ohne Sub).
function billingCycleForPriceId(env: Env, priceId: string | null): string | null {
  if (!priceId) return null;
  if (priceId === env.PADDLE_PRICE_MONTHLY) return 'monthly';
  if (priceId === env.PADDLE_PRICE_HALFYEAR) return 'halfyear';
  if (priceId === env.PADDLE_PRICE_YEARLY) return 'yearly';
  return null;
}

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

  // Laufzeit-Bezeichnung nur bei Pro-Subs sinnvoll. Wir lesen die aktuellste
  // Sub des Users in dieser Brand und mappen ihre Paddle-Price-ID auf
  // monthly/halfyear/yearly.
  let billingCycle: string | null = null;
  if (entitlement && entitlement.source === 'subscription') {
    const sub = await env.DB.prepare(
      `SELECT plan_id FROM subscriptions
        WHERE user_id = ? AND brand_id = ?
        ORDER BY updated_at DESC LIMIT 1`,
    )
      .bind(user.id, env.BRAND_ID)
      .first<{ plan_id: string }>();
    billingCycle = billingCycleForPriceId(env, sub?.plan_id ?? null);
  }

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
            billingCycle,
          },
        ]
      : [],
    deviceLimit: Number(env.DEVICE_LIMIT || '3'),
    activeDevices: devices.length,
  });
};
