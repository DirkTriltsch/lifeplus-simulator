import type { Env } from '../env';
import { randomId } from './crypto';
import { findUserByEmail, upsertUserByEmail } from './db';
import { type PaddleSubscriberRecord, paddleFindSubscriberByEmail } from './paddle';

const GRACE_DAYS_PAST_DUE = 7;

export type PaddleSubscriberLookup = (
  env: Env,
  emailLower: string,
) => Promise<PaddleSubscriberRecord | null>;

export async function bootstrapUserFromPaddle(
  env: Env,
  emailLower: string,
  now: number,
  lookup: PaddleSubscriberLookup = paddleFindSubscriberByEmail,
): Promise<boolean> {
  if (await findUserByEmail(env, emailLower)) return true;

  let subscriber: PaddleSubscriberRecord | null = null;
  try {
    subscriber = await lookup(env, emailLower);
  } catch (err) {
    console.warn('paddle_subscriber_bootstrap_lookup_failed', err);
    return false;
  }
  if (!subscriber) return false;

  const user = await upsertUserByEmail(env, emailLower, now, randomId);
  await upsertImportedSubscription(env, user.id, subscriber, now);
  await writeImportedEntitlement(env, user.id, subscriber, now);
  return true;
}

async function upsertImportedSubscription(
  env: Env,
  userId: string,
  subscriber: PaddleSubscriberRecord,
  now: number,
): Promise<void> {
  const existing = await env.DB.prepare(
    'SELECT id FROM subscriptions WHERE paddle_subscription_id = ? LIMIT 1',
  )
    .bind(subscriber.subscriptionId)
    .first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      `UPDATE subscriptions
       SET status = ?, plan_id = ?, current_period_ends_at = ?, canceled_at = ?, paddle_customer_id = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        subscriber.status,
        subscriber.priceId,
        subscriber.currentPeriodEndsAt,
        subscriber.canceledAt,
        subscriber.customerId,
        now,
        existing.id,
      )
      .run();
    return;
  }

  await env.DB.prepare(
    `INSERT INTO subscriptions
      (id, user_id, paddle_customer_id, paddle_subscription_id, brand_id, plan_id, status,
       current_period_ends_at, canceled_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      randomId(),
      userId,
      subscriber.customerId,
      subscriber.subscriptionId,
      env.BRAND_ID,
      subscriber.priceId,
      subscriber.status,
      subscriber.currentPeriodEndsAt,
      subscriber.canceledAt,
      now,
      now,
    )
    .run();
}

async function writeImportedEntitlement(
  env: Env,
  userId: string,
  subscriber: PaddleSubscriberRecord,
  now: number,
): Promise<void> {
  const existing = await env.DB.prepare(
    'SELECT id FROM entitlements WHERE user_id = ? AND brand_id = ? LIMIT 1',
  )
    .bind(userId, env.BRAND_ID)
    .first<{ id: string }>();
  const validUntil = importedValidUntil(subscriber, now);

  if (existing) {
    await env.DB.prepare(
      'UPDATE entitlements SET access_level = ?, valid_until = ?, source = ?, updated_at = ? WHERE id = ?',
    )
      .bind('pro', validUntil, 'subscription', now, existing.id)
      .run();
    return;
  }

  await env.DB.prepare(
    `INSERT INTO entitlements (id, user_id, brand_id, access_level, valid_until, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(randomId(), userId, env.BRAND_ID, 'pro', validUntil, 'subscription', now, now)
    .run();
}

function importedValidUntil(subscriber: PaddleSubscriberRecord, now: number): number | null {
  if (subscriber.status === 'active' || subscriber.status === 'trialing') {
    return subscriber.currentPeriodEndsAt;
  }
  if (subscriber.status === 'past_due') {
    return subscriber.currentPeriodEndsAt !== null
      ? subscriber.currentPeriodEndsAt + GRACE_DAYS_PAST_DUE * 86_400_000
      : now;
  }
  return now;
}
