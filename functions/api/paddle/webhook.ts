import type { Env } from '../../env';
import { randomId } from '../../_lib/crypto';
import { upsertUserByEmail } from '../../_lib/db';
import { verifyPaddleSignature } from '../../_lib/paddle-sig';
import { error, json, methodNotAllowed, text } from '../../_lib/responses';
import { daysFromNow, nowMs } from '../../_lib/time';

const GRACE_DAYS_PAST_DUE = 7;

interface PaddleEvent {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: PaddleEventData;
}

interface PaddleEventData {
  id?: string;
  customer_id?: string;
  subscription_id?: string;
  status?: string;
  items?: Array<{ price?: { id?: string; product_id?: string } }>;
  current_billing_period?: { ends_at?: string };
  scheduled_change?: { action?: string; effective_at?: string };
  canceled_at?: string;
  customer?: { email?: string };
  email?: string;
  custom_data?: Record<string, unknown> | null;
  transaction_id?: string;
  subscription?: { id?: string };
  transaction?: { id?: string };
}

interface PaddleCustomerResponse {
  data?: {
    email?: string;
  };
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  if (!env.PADDLE_WEBHOOK_SECRET) {
    return error(500, 'webhook_secret_missing');
  }

  const rawBody = await request.text();
  const verified = await verifyPaddleSignature(
    env.PADDLE_WEBHOOK_SECRET,
    rawBody,
    request.headers.get('paddle-signature'),
    nowMs(),
  );
  if (!verified.valid) return error(401, 'bad_signature', verified.reason);

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return error(400, 'bad_json');
  }

  const eventId = event.event_id;
  const eventType = event.event_type;
  if (!eventId || !eventType) return error(400, 'missing_event_fields');

  // Idempotency: insert into webhook_events, ignore on conflict. If a previous
  // processing attempt failed, processed_at stays NULL so Paddle retries can
  // run the handler again.
  const insertResult = await env.DB.prepare(
    'INSERT OR IGNORE INTO webhook_events (id, type, payload_json, received_at) VALUES (?, ?, ?, ?)',
  )
    .bind(eventId, eventType, rawBody, nowMs())
    .run();
  const isNew = (insertResult.meta?.changes ?? 0) > 0;
  if (!isNew) {
    const existing = await env.DB.prepare(
      'SELECT processed_at FROM webhook_events WHERE id = ? LIMIT 1',
    )
      .bind(eventId)
      .first<{ processed_at: number | null }>();
    if (existing?.processed_at !== null && existing?.processed_at !== undefined) {
      return text('duplicate', 200);
    }
  }

  try {
    await processEvent(env, event);
    await env.DB.prepare('UPDATE webhook_events SET processed_at = ? WHERE id = ?')
      .bind(nowMs(), eventId)
      .run();
  } catch (err) {
    console.error('webhook_process_failed', eventType, err);
    return error(500, 'process_failed', String(err));
  }

  return json({ ok: true });
};

async function processEvent(env: Env, event: PaddleEvent): Promise<void> {
  const type = event.event_type ?? '';
  const data = event.data ?? {};

  switch (type) {
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.activated':
    case 'subscription.canceled':
    case 'subscription.past_due':
    case 'subscription.paused':
    case 'subscription.resumed':
    case 'subscription.trialing':
      await upsertSubscription(env, data);
      break;

    case 'transaction.paid':
      // Renewals and one-shots. If the transaction is linked to a subscription
      // the subscription.updated event carries the canonical state, so we only
      // act here when there is no subscription_id (i.e. one-shot purchases).
      if (data.subscription_id) {
        await storeTransactionForSubscription(env, data);
      } else {
        await applyOneShotPurchase(env, data);
      }
      break;

    case 'transaction.payment_failed':
    case 'transaction.canceled':
      // Soft events — Paddle will follow up with subscription.* state changes.
      break;

    case 'adjustment.created':
    case 'adjustment.updated':
      // Refunds, credits, chargeback adjustments. Revoke entitlement.
      await handleRefund(env, data);
      break;

    default:
      // Unhandled — recorded in webhook_events for audit.
      break;
  }
}

async function upsertSubscription(env: Env, data: PaddleEventData): Promise<void> {
  if (!customDataMatchesBrand(env, data.custom_data)) {
    console.warn('paddle_webhook_brand_mismatch', data.custom_data);
    return;
  }

  const customerEmail =
    data.customer?.email ??
    data.email ??
    customDataEmail(data.custom_data) ??
    (await fetchPaddleCustomerEmail(env, data.customer_id));
  if (!customerEmail) return;

  const now = nowMs();
  const user = await upsertUserByEmail(env, customerEmail, now, () => crypto.randomUUID());

  const subscriptionId = data.subscription_id ?? data.id ?? null;
  if (!subscriptionId) return;

  const planId = data.items?.[0]?.price?.id ?? 'unknown';
  if (!isAllowedPriceId(env, planId)) {
    console.warn('paddle_webhook_unknown_price', planId);
    return;
  }

  const status = data.status ?? 'unknown';
  const periodEndsAt = data.current_billing_period?.ends_at
    ? Date.parse(data.current_billing_period.ends_at)
    : null;
  const canceledAt = data.canceled_at ? Date.parse(data.canceled_at) : null;

  const existing = await env.DB.prepare(
    'SELECT id FROM subscriptions WHERE paddle_subscription_id = ? LIMIT 1',
  )
    .bind(subscriptionId)
    .first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      `UPDATE subscriptions
       SET status = ?, plan_id = ?, current_period_ends_at = ?, canceled_at = ?, paddle_customer_id = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(status, planId, periodEndsAt, canceledAt, data.customer_id ?? null, now, existing.id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, paddle_customer_id, paddle_subscription_id, brand_id, plan_id, status,
         current_period_ends_at, canceled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        user.id,
        data.customer_id ?? null,
        subscriptionId,
        env.BRAND_ID,
        planId,
        status,
        periodEndsAt,
        canceledAt,
        now,
        now,
      )
      .run();
  }

  await recomputeEntitlement(env, user.id, status, periodEndsAt, 'subscription');
}

async function storeTransactionForSubscription(env: Env, data: PaddleEventData): Promise<void> {
  if (!customDataMatchesBrand(env, data.custom_data)) {
    console.warn('paddle_transaction_brand_mismatch', data.custom_data);
    return;
  }

  const planId = data.items?.[0]?.price?.id ?? null;
  if (planId && !isAllowedPriceId(env, planId)) {
    console.warn('paddle_transaction_unknown_price', planId);
    return;
  }

  const subscriptionId = data.subscription_id;
  const transactionId = data.id ?? data.transaction_id ?? data.transaction?.id ?? null;
  if (!subscriptionId || !transactionId) return;

  await env.DB.prepare(
    `UPDATE subscriptions
     SET paddle_transaction_id = ?, updated_at = ?
     WHERE paddle_subscription_id = ?`,
  )
    .bind(transactionId, nowMs(), subscriptionId)
    .run();
}

async function fetchPaddleCustomerEmail(
  env: Env,
  customerId: string | undefined,
): Promise<string | null> {
  if (!customerId || !env.PADDLE_API_KEY) return null;

  const apiBase =
    env.PADDLE_ENV === 'live'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';

  const res = await fetch(`${apiBase}/customers/${encodeURIComponent(customerId)}`, {
    headers: { authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn('paddle_customer_fetch_failed', {
      status: res.status,
      statusText: res.statusText,
      customerId,
      body: body.slice(0, 500),
    });
    return null;
  }

  const customer = (await res.json()) as PaddleCustomerResponse;
  return customer.data?.email ?? null;
}

async function applyOneShotPurchase(env: Env, data: PaddleEventData): Promise<void> {
  if (!customDataMatchesBrand(env, data.custom_data)) {
    console.warn('paddle_one_shot_brand_mismatch', data.custom_data);
    return;
  }

  const planId = data.items?.[0]?.price?.id ?? null;
  if (planId && !isAllowedPriceId(env, planId)) {
    console.warn('paddle_one_shot_unknown_price', planId);
    return;
  }

  const customerEmail = data.customer?.email ?? data.email ?? customDataEmail(data.custom_data);
  if (!customerEmail) return;
  const now = nowMs();
  const user = await upsertUserByEmail(env, customerEmail, now, () => crypto.randomUUID());

  // For lifetime-style one-shots, valid_until = null means "forever".
  await writeEntitlement(env, user.id, 'lifetime', null, 'one_shot_purchase');
}

async function handleRefund(env: Env, data: PaddleEventData): Promise<void> {
  // Adjustments and refunds reference a transaction or subscription.
  const subscriptionId = data.subscription_id ?? data.subscription?.id ?? null;
  const transactionId = data.transaction_id ?? data.transaction?.id ?? data.id ?? null;

  const sub = subscriptionId
    ? await env.DB.prepare(
        'SELECT user_id FROM subscriptions WHERE paddle_subscription_id = ? LIMIT 1',
      )
        .bind(subscriptionId)
        .first<{ user_id: string }>()
    : transactionId
      ? await env.DB.prepare(
          'SELECT user_id FROM subscriptions WHERE paddle_transaction_id = ? LIMIT 1',
        )
          .bind(transactionId)
          .first<{ user_id: string }>()
      : null;
  if (!sub) return;

  await writeEntitlement(env, sub.user_id, 'pro', nowMs(), 'refund_revoked');
}

function isAllowedPriceId(env: Env, priceId: string): boolean {
  return [env.PADDLE_PRICE_MONTHLY, env.PADDLE_PRICE_YEARLY].filter(Boolean).includes(priceId);
}

function customDataMatchesBrand(
  env: Env,
  customData: Record<string, unknown> | null | undefined,
): boolean {
  const brandId = customData?.brand_id;
  return brandId === undefined || brandId === env.BRAND_ID;
}

function customDataEmail(customData: Record<string, unknown> | null | undefined): string | null {
  const email = customData?.checkout_email;
  return typeof email === 'string' && email.includes('@') ? email.toLowerCase() : null;
}

async function recomputeEntitlement(
  env: Env,
  userId: string,
  status: string,
  periodEndsAt: number | null,
  source: string,
): Promise<void> {
  let validUntil: number | null = null;
  let accessLevel = 'pro';

  switch (status) {
    case 'active':
    case 'trialing':
      validUntil = periodEndsAt; // null acts as open-ended until next update
      break;
    case 'past_due':
      validUntil =
        periodEndsAt !== null ? periodEndsAt + GRACE_DAYS_PAST_DUE * 86_400_000 : null;
      break;
    case 'canceled':
      // Access until period end if known, else immediate.
      validUntil = periodEndsAt ?? nowMs();
      break;
    case 'paused':
    default:
      validUntil = nowMs();
      break;
  }

  await writeEntitlement(env, userId, accessLevel, validUntil, source);
}

async function writeEntitlement(
  env: Env,
  userId: string,
  accessLevel: string,
  validUntil: number | null,
  source: string,
): Promise<void> {
  const existing = await env.DB.prepare(
    'SELECT id FROM entitlements WHERE user_id = ? AND brand_id = ? LIMIT 1',
  )
    .bind(userId, env.BRAND_ID)
    .first<{ id: string }>();

  const now = nowMs();
  if (existing) {
    await env.DB.prepare(
      'UPDATE entitlements SET access_level = ?, valid_until = ?, source = ?, updated_at = ? WHERE id = ?',
    )
      .bind(accessLevel, validUntil, source, now, existing.id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO entitlements (id, user_id, brand_id, access_level, valid_until, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(randomId(), userId, env.BRAND_ID, accessLevel, validUntil, source, now, now)
      .run();
  }
}
