import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { findUserByEmail, getEntitlementForBrand, isEntitlementActive } from '../../_lib/db';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

interface Body {
  priceId?: string;
  email?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function allowedPriceIds(env: Env): Set<string> {
  return new Set([env.PADDLE_PRICE_MONTHLY, env.PADDLE_PRICE_YEARLY].filter(Boolean));
}

// Pre-checkout intent endpoint. The pricing page calls this BEFORE opening the
// Paddle overlay, so we can short-circuit duplicate purchases.
//   action = "start_checkout"      -> proceed with Paddle.Checkout.open()
//   action = "already_active"      -> already has access; send to /app
//   action = "manage_subscription" -> already has a sub; send to billing portal
//   action = "login_required"      -> need a magic link first
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const priceId = (body.priceId ?? '').trim();
  if (!priceId) return error(400, 'missing_price_id');
  if (!allowedPriceIds(env).has(priceId)) return error(400, 'invalid_price_id');

  // Try logged-in user first.
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  let userId: string | null = null;
  let email: string | null = null;

  if (token) {
    const ctx = await loadSessionFromToken(env, token);
    if (ctx) {
      userId = ctx.user.id;
      email = ctx.user.email;
    }
  }

  if (!userId) {
    const claimedEmail = (body.email ?? '').trim().toLowerCase();
    if (claimedEmail && EMAIL_RX.test(claimedEmail)) {
      const existing = await findUserByEmail(env, claimedEmail);
      if (existing) {
        userId = existing.id;
        email = existing.email;
      } else {
        // Fresh email — proceed straight to checkout.
        return json({ action: 'start_checkout', email: claimedEmail });
      }
    } else {
      return json({ action: 'login_required' });
    }
  }

  if (!userId || !email) return json({ action: 'start_checkout' });

  const entitlement = await getEntitlementForBrand(env, userId, env.BRAND_ID);
  if (isEntitlementActive(entitlement, nowMs())) {
    return json({ action: 'already_active', email });
  }

  const hasOpenSub = await env.DB.prepare(
    `SELECT id, status FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due')
       LIMIT 1`,
  )
    .bind(userId)
    .first<{ id: string; status: string }>();

  if (hasOpenSub) {
    return json({ action: 'manage_subscription', email });
  }

  return json({ action: 'start_checkout', email });
};
