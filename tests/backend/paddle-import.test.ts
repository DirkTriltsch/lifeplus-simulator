import { describe, expect, it } from 'vitest';
import type { Env } from '../../functions/env';
import { bootstrapUserFromPaddle } from '../../functions/_lib/paddleImport';

interface UserRecord {
  id: string;
  email: string;
  email_lower: string;
  created_at: number;
  deleted_at: number | null;
}

interface SubscriptionRecord {
  id: string;
  user_id: string;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  brand_id: string;
  plan_id: string;
  status: string;
  current_period_ends_at: number | null;
  canceled_at: number | null;
}

interface EntitlementRecord {
  id: string;
  user_id: string;
  brand_id: string;
  access_level: string;
  valid_until: number | null;
  source: string;
}

class MemoryD1 {
  users = new Map<string, UserRecord>();
  subscriptions = new Map<string, SubscriptionRecord>();
  entitlements = new Map<string, EntitlementRecord>();

  prepare(sql: string) {
    return new Statement(this, sql);
  }
}

class Statement {
  private params: unknown[] = [];

  constructor(private readonly db: MemoryD1, private readonly sql: string) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const sql = normalizeSql(this.sql);
    if (sql.includes('SELECT * FROM users WHERE email_lower')) {
      return (this.db.users.get(String(this.params[0])) ?? null) as T | null;
    }
    if (sql.includes('SELECT id FROM subscriptions WHERE paddle_subscription_id')) {
      const sub = this.db.subscriptions.get(String(this.params[0]));
      return (sub ? { id: sub.id } : null) as T | null;
    }
    if (sql.includes('SELECT id FROM entitlements WHERE user_id')) {
      const userId = String(this.params[0]);
      const brandId = String(this.params[1]);
      const ent = Array.from(this.db.entitlements.values())
        .find((r) => r.user_id === userId && r.brand_id === brandId);
      return (ent ? { id: ent.id } : null) as T | null;
    }
    throw new Error(`Unhandled first SQL: ${this.sql}`);
  }

  async run(): Promise<D1Result> {
    const sql = normalizeSql(this.sql);
    if (sql.startsWith('INSERT INTO users')) {
      const [id, email, emailLower, createdAt] = this.params;
      this.db.users.set(String(emailLower), {
        id: String(id),
        email: String(email),
        email_lower: String(emailLower),
        created_at: Number(createdAt),
        deleted_at: null,
      });
      return changes(1);
    }
    if (sql.startsWith('INSERT INTO subscriptions')) {
      const [
        id,
        userId,
        customerId,
        subscriptionId,
        brandId,
        planId,
        status,
        periodEndsAt,
        canceledAt,
      ] = this.params;
      this.db.subscriptions.set(String(subscriptionId), {
        id: String(id),
        user_id: String(userId),
        paddle_customer_id: customerId === null ? null : String(customerId),
        paddle_subscription_id: subscriptionId === null ? null : String(subscriptionId),
        brand_id: String(brandId),
        plan_id: String(planId),
        status: String(status),
        current_period_ends_at: periodEndsAt === null ? null : Number(periodEndsAt),
        canceled_at: canceledAt === null ? null : Number(canceledAt),
      });
      return changes(1);
    }
    if (sql.startsWith('UPDATE subscriptions')) {
      const [status, planId, periodEndsAt, canceledAt, customerId, , id] = this.params;
      const sub = Array.from(this.db.subscriptions.values()).find((r) => r.id === id);
      if (!sub) return changes(0);
      sub.status = String(status);
      sub.plan_id = String(planId);
      sub.current_period_ends_at = periodEndsAt === null ? null : Number(periodEndsAt);
      sub.canceled_at = canceledAt === null ? null : Number(canceledAt);
      sub.paddle_customer_id = customerId === null ? null : String(customerId);
      return changes(1);
    }
    if (sql.startsWith('INSERT INTO entitlements')) {
      const [id, userId, brandId, accessLevel, validUntil, source] = this.params;
      this.db.entitlements.set(String(id), {
        id: String(id),
        user_id: String(userId),
        brand_id: String(brandId),
        access_level: String(accessLevel),
        valid_until: validUntil === null ? null : Number(validUntil),
        source: String(source),
      });
      return changes(1);
    }
    if (sql.startsWith('UPDATE entitlements')) {
      const [accessLevel, validUntil, source, , id] = this.params;
      const ent = this.db.entitlements.get(String(id));
      if (!ent) return changes(0);
      ent.access_level = String(accessLevel);
      ent.valid_until = validUntil === null ? null : Number(validUntil);
      ent.source = String(source);
      return changes(1);
    }
    throw new Error(`Unhandled run SQL: ${this.sql}`);
  }
}

describe('bootstrapUserFromPaddle', () => {
  it('imports an active Paddle subscriber into local users, subscriptions and entitlements', async () => {
    const db = new MemoryD1();
    const env = {
      DB: db as unknown as D1Database,
      BRAND_ID: 'lifeplus',
      PADDLE_PRICE_MONTHLY: 'pri_monthly',
      PADDLE_PRICE_HALFYEAR: 'pri_halfyear',
      PADDLE_PRICE_YEARLY: 'pri_yearly',
    } as Env;

    const imported = await bootstrapUserFromPaddle(
      env,
      'buyer@example.com',
      1_700_000_000_000,
      async () => ({
        customerId: 'ctm_123',
        subscriptionId: 'sub_123',
        status: 'active',
        priceId: 'pri_yearly',
        currentPeriodEndsAt: 1_800_000_000_000,
        canceledAt: null,
      }),
    );

    const user = db.users.get('buyer@example.com');
    expect(imported).toBe(true);
    expect(user).toMatchObject({ email: 'buyer@example.com', email_lower: 'buyer@example.com' });
    expect(Array.from(db.subscriptions.values())).toEqual([
      expect.objectContaining({
        user_id: user?.id,
        paddle_customer_id: 'ctm_123',
        paddle_subscription_id: 'sub_123',
        plan_id: 'pri_yearly',
        status: 'active',
      }),
    ]);
    expect(Array.from(db.entitlements.values())).toEqual([
      expect.objectContaining({
        user_id: user?.id,
        brand_id: 'lifeplus',
        access_level: 'pro',
        source: 'subscription',
        valid_until: 1_800_000_000_000,
      }),
    ]);
  });
});

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function changes(n: number): D1Result {
  return { success: true, meta: { changes: n } } as unknown as D1Result;
}
