import type { Env } from '../env';

export interface UserRow {
  id: string;
  email: string;
  email_lower: string;
  created_at: number;
  deleted_at: number | null;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  paddle_transaction_id: string | null;
  brand_id: string;
  plan_id: string;
  status: string;
  current_period_ends_at: number | null;
  canceled_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface EntitlementRow {
  id: string;
  user_id: string;
  brand_id: string;
  access_level: string;
  valid_until: number | null;
  source: string;
  created_at: number;
  updated_at: number;
}

export interface DeviceRow {
  id: string;
  user_id: string;
  device_token_hash: string;
  label: string | null;
  user_agent: string | null;
  first_seen_at: number;
  last_seen_at: number;
  revoked_at: number | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  device_id: string;
  session_token_hash: string;
  kind: string;
  expires_at: number;
  last_seen_at: number;
  revoked_at: number | null;
}

export async function findUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  const row = await env.DB.prepare(
    'SELECT * FROM users WHERE email_lower = ? AND deleted_at IS NULL LIMIT 1',
  )
    .bind(email.toLowerCase())
    .first<UserRow>();
  return row ?? null;
}

export async function findUserById(env: Env, id: string): Promise<UserRow | null> {
  const row = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
  )
    .bind(id)
    .first<UserRow>();
  return row ?? null;
}

export async function upsertUserByEmail(
  env: Env,
  email: string,
  now: number,
  id: () => string,
): Promise<UserRow> {
  const existing = await findUserByEmail(env, email);
  if (existing) return existing;

  const userId = id();
  await env.DB.prepare(
    'INSERT INTO users (id, email, email_lower, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(userId, email, email.toLowerCase(), now)
    .run();

  return {
    id: userId,
    email,
    email_lower: email.toLowerCase(),
    created_at: now,
    deleted_at: null,
  };
}

export async function getActiveDevices(env: Env, userId: string): Promise<DeviceRow[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM devices WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC',
  )
    .bind(userId)
    .all<DeviceRow>();
  return result.results ?? [];
}

export async function getEntitlementForBrand(
  env: Env,
  userId: string,
  brandId: string,
): Promise<EntitlementRow | null> {
  const row = await env.DB.prepare(
    'SELECT * FROM entitlements WHERE user_id = ? AND brand_id = ? LIMIT 1',
  )
    .bind(userId, brandId)
    .first<EntitlementRow>();
  return row ?? null;
}

export function isEntitlementActive(entitlement: EntitlementRow | null, now: number): boolean {
  if (!entitlement) return false;
  if (entitlement.valid_until === null) return true;
  return entitlement.valid_until > now;
}

export async function grantFreeEntitlementIfMissing(
  env: Env,
  userId: string,
  brandId: string,
  now: number,
  id: () => string,
): Promise<void> {
  const existing = await getEntitlementForBrand(env, userId, brandId);
  if (existing && isEntitlementActive(existing, now) && existing.access_level !== 'free') return;
  if (existing && isEntitlementActive(existing, now) && existing.access_level === 'free') return;

  if (existing) {
    await env.DB.prepare(
      'UPDATE entitlements SET access_level = ?, valid_until = ?, source = ?, updated_at = ? WHERE id = ?',
    )
      .bind('free', null, 'free_signup', now, existing.id)
      .run();
    return;
  }

  await env.DB.prepare(
    `INSERT INTO entitlements (id, user_id, brand_id, access_level, valid_until, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id(), userId, brandId, 'free', null, 'free_signup', now, now)
    .run();
}

// DEPRECATED ab Phase 2.2 — Beta-Grace wird nicht mehr automatisch beim
// Magic-Link-Verify vergeben. Wer Pro-Zugang braucht: entweder Trial via
// /signup oder echter Kauf via /checkout. Bestandsuser mit source='beta_grace'
// behalten ihre Entitlements, neue werden nicht mehr erzeugt.
//
// Funktion bleibt vorerst exportiert, falls Admin-Skripte sie ad-hoc nutzen.
export async function grantProEntitlementIfMissing(
  env: Env,
  userId: string,
  brandId: string,
  now: number,
  id: () => string,
): Promise<void> {
  const existing = await getEntitlementForBrand(env, userId, brandId);
  if (existing && isEntitlementActive(existing, now)) return;

  if (existing) {
    await env.DB.prepare(
      'UPDATE entitlements SET access_level = ?, valid_until = ?, source = ?, updated_at = ? WHERE id = ?',
    )
      .bind('pro', null, 'beta_grace', now, existing.id)
      .run();
    return;
  }

  await env.DB.prepare(
    `INSERT INTO entitlements (id, user_id, brand_id, access_level, valid_until, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id(), userId, brandId, 'pro', null, 'beta_grace', now, now)
    .run();
}

// Phase 2-Review Fix — Server-seitige Checkout-Intents.
// Lifecycle siehe migrations/0005_checkout_intents.sql.
export interface CheckoutIntentRow {
  id: string;
  user_id: string;
  brand_id: string;
  plan: string;
  price_id: string;
  checkout_email: string;
  created_at: number;
  expires_at: number;
  consumed_at: number | null;
  consumed_paddle_subscription_id: string | null;
  consumed_paddle_transaction_id: string | null;
}

export async function createCheckoutIntent(
  env: Env,
  params: {
    id: string;
    userId: string;
    brandId: string;
    plan: string;
    priceId: string;
    checkoutEmail: string;
    now: number;
    ttlMs: number;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO checkout_intents
       (id, user_id, brand_id, plan, price_id, checkout_email, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      params.id,
      params.userId,
      params.brandId,
      params.plan,
      params.priceId,
      params.checkoutEmail,
      params.now,
      params.now + params.ttlMs,
    )
    .run();
}

export async function getCheckoutIntentById(
  env: Env,
  intentId: string,
): Promise<CheckoutIntentRow | null> {
  const row = await env.DB.prepare(
    'SELECT * FROM checkout_intents WHERE id = ? LIMIT 1',
  )
    .bind(intentId)
    .first<CheckoutIntentRow>();
  return row ?? null;
}

export async function markCheckoutIntentConsumed(
  env: Env,
  intentId: string,
  now: number,
  paddleSubscriptionId: string | null,
  paddleTransactionId: string | null,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE checkout_intents
       SET consumed_at = ?,
           consumed_paddle_subscription_id = COALESCE(consumed_paddle_subscription_id, ?),
           consumed_paddle_transaction_id  = COALESCE(consumed_paddle_transaction_id, ?)
     WHERE id = ? AND consumed_at IS NULL`,
  )
    .bind(now, paddleSubscriptionId, paddleTransactionId, intentId)
    .run();
}

// Phase 2.6 — Lazy-Trial-Check. Wird von /api/me beim Lesen des Entitlements
// aufgerufen. Wenn ein source='trial' Eintrag abgelaufen ist, wird er auf
// access_level='free', source='trial_expired', valid_until=NULL degradiert.
// Race-Schutz ueber WHERE-Bedingung im UPDATE (idempotent bei concurrent
// Aufrufen — wer "verliert", sieht beim Re-Fetch den degradierten Zustand).
export async function degradeExpiredTrial(
  env: Env,
  entitlement: EntitlementRow | null,
  now: number,
): Promise<EntitlementRow | null> {
  if (!entitlement) return null;
  if (entitlement.source !== 'trial') return entitlement;
  if (entitlement.valid_until === null) return entitlement;
  if (entitlement.valid_until > now) return entitlement;

  const result = await env.DB.prepare(
    `UPDATE entitlements
       SET access_level = 'free',
           source = 'trial_expired',
           valid_until = NULL,
           updated_at = ?
     WHERE id = ? AND source = 'trial' AND valid_until <= ?`,
  )
    .bind(now, entitlement.id, now)
    .run();

  if ((result.meta?.changes ?? 0) > 0) {
    return {
      ...entitlement,
      access_level: 'free',
      source: 'trial_expired',
      valid_until: null,
      updated_at: now,
    };
  }

  // Race: jemand anders hat schon degradiert (oder den Status anders gesetzt).
  // Re-fetch um den aktuellen Stand zurueckzugeben.
  return getEntitlementForBrand(env, entitlement.user_id, entitlement.brand_id);
}

// Phase 2.2 — Free-Signup-Trial. Vergibt Pro fuer trialDays Tage.
// source='trial', valid_until = now + trialDays * 86_400_000.
// Wer bereits eine aktive bezahlte Subscription (oder One-Shot/Lifetime)
// hat, behaelt diese — Trial ueberschreibt KEIN paid Entitlement.
export async function grantTrialEntitlementIfMissing(
  env: Env,
  userId: string,
  brandId: string,
  now: number,
  trialDays: number,
  id: () => string,
): Promise<void> {
  const existing = await getEntitlementForBrand(env, userId, brandId);
  if (
    existing &&
    isEntitlementActive(existing, now) &&
    (existing.source === 'subscription' || existing.source === 'one_shot_purchase')
  ) {
    return;
  }

  const validUntil = now + trialDays * 86_400_000;

  if (existing) {
    await env.DB.prepare(
      'UPDATE entitlements SET access_level = ?, valid_until = ?, source = ?, updated_at = ? WHERE id = ?',
    )
      .bind('pro', validUntil, 'trial', now, existing.id)
      .run();
    return;
  }

  await env.DB.prepare(
    `INSERT INTO entitlements (id, user_id, brand_id, access_level, valid_until, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id(), userId, brandId, 'pro', validUntil, 'trial', now, now)
    .run();
}

// Phase 2.2 — Append-only Insert ins Consent-Audit-Log.
// Wird sowohl vom Magic-Link-Verify (free_signup) als auch vom Paddle-Webhook
// (pro_checkout) aufgerufen. Boolean-Felder werden als 0/1 in INTEGER abgelegt.
export interface ConsentLogParams {
  checkoutUserId: string;
  sessionUserId?: string | null;
  checkoutEmail: string;
  sessionEmail?: string | null;
  brandId: string;
  context: 'free_signup' | 'pro_checkout';
  acceptedAgb: boolean;
  acceptedPrivacy: boolean;
  acceptedWithdrawalWaiver?: boolean;
  newsletterOptIn?: boolean;
  documentVersion: string;
  clientTimestampIso?: string | null;
  paddleTransactionId?: string | null;
  paddleSubscriptionId?: string | null;
  requestIp?: string | null;
  userAgent?: string | null;
}

export async function insertConsentLog(
  env: Env,
  now: number,
  id: () => string,
  params: ConsentLogParams,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO consent_log (
       id, checkout_user_id, session_user_id, checkout_email, session_email,
       brand_id, context, accepted_agb, accepted_privacy,
       accepted_withdrawal_waiver, newsletter_opt_in, document_version,
       client_timestamp_iso,
       paddle_transaction_id, paddle_subscription_id,
       request_ip, user_agent, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id(),
      params.checkoutUserId,
      params.sessionUserId ?? null,
      params.checkoutEmail,
      params.sessionEmail ?? null,
      params.brandId,
      params.context,
      params.acceptedAgb ? 1 : 0,
      params.acceptedPrivacy ? 1 : 0,
      params.acceptedWithdrawalWaiver ? 1 : 0,
      params.newsletterOptIn ? 1 : 0,
      params.documentVersion,
      params.clientTimestampIso ?? null,
      params.paddleTransactionId ?? null,
      params.paddleSubscriptionId ?? null,
      params.requestIp ?? null,
      params.userAgent ?? null,
      now,
    )
    .run();
}
