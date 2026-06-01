import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { randomId } from '../../_lib/crypto';
import {
  createCheckoutIntent,
  getEntitlementForBrand,
  isEntitlementActive,
} from '../../_lib/db';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

// Phase 2.3 — Pre-Checkout-Intent + Server-side Intent-Persistierung
// (verstaerkt nach Review).
//
// Identitaetsregel:
//   Pro-Checkout nur mit Session (kein Gast).
//   checkoutEmail MUSS == session.email — kein Kauf fuer fremde Adresse.
//   Bei action='start_checkout' wird ein Eintrag in checkout_intents
//   geschrieben (intentId in Response + customData). Der Webhook verifiziert
//   ueber diesen Eintrag, dass das Paddle-Event tatsaechlich zum
//   eingeloggten User gehoert — verhindert customData-Manipulation via
//   public Paddle Token.
//
// Request:  { plan, checkoutEmail }
// Response: { action, priceId?, checkoutEmail?, sessionUserId?, brandId, intentId? }

interface Body {
  plan?: string;
  checkoutEmail?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ALLOWED_PLANS = ['monthly', 'halfyear', 'yearly'] as const;
type PlanKey = (typeof ALLOWED_PLANS)[number];
const INTENT_TTL_MS = 30 * 60_000;                      // 30 Minuten

function priceIdForPlan(env: Env, plan: PlanKey): string | undefined {
  if (plan === 'monthly')  return env.PADDLE_PRICE_MONTHLY;
  if (plan === 'halfyear') return env.PADDLE_PRICE_HALFYEAR;
  if (plan === 'yearly')   return env.PADDLE_PRICE_YEARLY;
  return undefined;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  // 1. Plan validieren + priceId mappen
  const planRaw = (body.plan ?? '').trim();
  if (!(ALLOWED_PLANS as readonly string[]).includes(planRaw)) {
    return json({ action: 'invalid_plan', brandId: env.BRAND_ID });
  }
  const plan = planRaw as PlanKey;
  const priceId = priceIdForPlan(env, plan);
  if (!priceId) {
    console.warn('checkout_intent_missing_price_id', { plan });
    return json({ action: 'invalid_plan', brandId: env.BRAND_ID });
  }

  // 2. checkoutEmail validieren
  const checkoutEmail = (body.checkoutEmail ?? '').trim().toLowerCase();
  if (!checkoutEmail || !EMAIL_RX.test(checkoutEmail) || checkoutEmail.length > 254) {
    return error(400, 'invalid_email');
  }

  // 3. Session zwingend (kein Gast)
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return json({ action: 'login_required', checkoutEmail, brandId: env.BRAND_ID });
  }
  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) {
    return json({ action: 'login_required', checkoutEmail, brandId: env.BRAND_ID });
  }

  // 4. Email-Match Pflicht — kein Kauf fuer fremde Adresse
  const sessionEmail = ctx.user.email.toLowerCase();
  if (sessionEmail !== checkoutEmail) {
    return json({
      action: 'email_mismatch',
      checkoutEmail,
      sessionUserId: ctx.user.id,
      brandId: env.BRAND_ID,
    });
  }

  // 5. Aktive bezahlte Sub → Customer Portal
  const hasOpenSub = await env.DB.prepare(
    `SELECT id, status FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due')
       LIMIT 1`,
  )
    .bind(ctx.user.id)
    .first<{ id: string; status: string }>();

  if (hasOpenSub) {
    return json({
      action: 'manage_subscription',
      priceId,
      checkoutEmail,
      sessionUserId: ctx.user.id,
      brandId: env.BRAND_ID,
    });
  }

  // 6. Aktives Lifetime/One-Shot → already_paid
  const entitlement = await getEntitlementForBrand(env, ctx.user.id, env.BRAND_ID);
  if (
    entitlement &&
    isEntitlementActive(entitlement, nowMs()) &&
    entitlement.source === 'one_shot_purchase'
  ) {
    return json({
      action: 'already_paid',
      priceId,
      checkoutEmail,
      sessionUserId: ctx.user.id,
      brandId: env.BRAND_ID,
    });
  }

  // 7. Server-Intent persistieren — Webhook verifiziert spaeter darueber
  const intentId = randomId();
  const now = nowMs();
  await createCheckoutIntent(env, {
    id:            intentId,
    userId:        ctx.user.id,
    brandId:       env.BRAND_ID,
    plan,
    priceId,
    checkoutEmail,
    now,
    ttlMs:         INTENT_TTL_MS,
  });

  return json({
    action: 'start_checkout',
    priceId,
    checkoutEmail,
    sessionUserId: ctx.user.id,
    brandId:       env.BRAND_ID,
    intentId,
  });
};
