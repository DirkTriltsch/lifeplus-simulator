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
