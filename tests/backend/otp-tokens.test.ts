import { describe, expect, it } from 'vitest';
import { createOtpToken, consumeOtpToken, hashOtpCode, type OtpTokenRow } from '../../functions/_lib/otpTokens';
import type { Env } from '../../functions/env';

interface TokenRecord {
  id: string;
  email_lower: string;
  token_hash: string;
  purpose: 'login' | 'free_signup';
  consent_payload_json: string | null;
  next_url: string | null;
  expires_at: number;
  used_at: number | null;
  created_at: number;
  request_ip: string | null;
  request_user_agent: string | null;
  attempt_count: number;
}

class MemoryD1 {
  tokens = new Map<string, TokenRecord>();
  active = new Map<string, { active_token_id: string; updated_at: number }>();

  prepare(sql: string) {
    return new MemoryStmt(this, sql);
  }

  async batch(stmts: MemoryStmt[]) {
    const results = [];
    for (const stmt of stmts) results.push(await stmt.run());
    return results;
  }
}

class MemoryStmt {
  private params: unknown[] = [];

  constructor(private db: MemoryD1, private sql: string) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const sql = this.sql;
    if (
      sql.includes('SELECT active_token_id FROM email_otp_active') &&
      !sql.includes('email_otp_tokens')
    ) {
      return (this.db.active.get(String(this.params[0])) ?? null) as T | null;
    }
    if (sql.includes('SELECT id,email_lower,purpose,consent_payload_json')) {
      const [email, hash, usedAt] = this.params;
      const row = [...this.db.tokens.values()]
        .filter((t) => t.email_lower === email && t.token_hash === hash && t.used_at === usedAt)
        .sort((a, b) => b.created_at - a.created_at)[0];
      return (row ? pickRow(row) : null) as T | null;
    }
    if (sql.includes('email_otp_tokens') && sql.includes('email_otp_active') && !sql.includes('COALESCE')) {
      const [email] = this.params;
      const activeId = this.db.active.get(String(email))?.active_token_id;
      const token = activeId ? this.db.tokens.get(activeId) : null;
      return (token ?? null) as T | null;
    }
    if (sql.includes('id <> COALESCE')) {
      const [email, hash] = this.params;
      const active = this.db.active.get(String(email))?.active_token_id ?? '';
      const row = [...this.db.tokens.values()]
        .find((t) => t.email_lower === email && t.token_hash === hash && t.used_at !== null && t.id !== active);
      return (row ? { id: row.id } : null) as T | null;
    }
    if (sql.includes('t.attempt_count >= ?') && sql.includes('SELECT t.id')) {
      const [email, hash, currentNow, maxAttempts] = this.params;
      const activeId = this.db.active.get(String(email))?.active_token_id;
      const token = activeId ? this.db.tokens.get(activeId) : null;
      if (
        token &&
        token.token_hash === hash &&
        token.expires_at > Number(currentNow) &&
        token.attempt_count >= Number(maxAttempts)
      ) {
        return { id: token.id } as T;
      }
      return null;
    }
    return null;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const sql = this.sql;
    if (sql.includes('used_at') && this.db.tokens.has(String(this.params[1]))) {
      const [now, id, guard] = this.params;
      const token = this.db.tokens.get(String(id));
      const guardNumber = typeof guard === 'number' ? guard : Number.NaN;
      const guardOk = Number.isFinite(guardNumber)
        ? token !== undefined && token.attempt_count < guardNumber
        : token !== undefined && (guard === undefined || token.email_lower === guard);
      if (token && guardOk && token.used_at === null) {
        token.used_at = Number(now);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.includes('INSERT INTO email_otp_tokens')) {
      const [
        id,
        email,
        hash,
        purpose,
        consent,
        nextUrl,
        expiresAt,
        createdAt,
        ip,
        ua,
      ] = this.params;
      this.db.tokens.set(String(id), {
        id: String(id),
        email_lower: String(email),
        token_hash: String(hash),
        purpose: purpose as 'login' | 'free_signup',
        consent_payload_json: consent === null ? null : String(consent),
        next_url: nextUrl === null ? null : String(nextUrl),
        expires_at: Number(expiresAt),
        used_at: null,
        created_at: Number(createdAt),
        request_ip: ip === null ? null : String(ip),
        request_user_agent: ua === null ? null : String(ua),
        attempt_count: 0,
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes('INSERT INTO email_otp_active')) {
      const [email, id, now] = this.params;
      this.db.active.set(String(email), { active_token_id: String(id), updated_at: Number(now) });
      return { meta: { changes: 1 } };
    }
    if (/SET\s+used_at\s*=\s*\?/.test(sql) && /WHERE\s+id\s*=\s*\?/.test(sql)) {
      const [now, id, guard] = this.params;
      const token = this.db.tokens.get(String(id));
      const guardOk = typeof guard === 'number'
        ? token !== undefined && token.attempt_count < guard
        : token !== undefined && token.email_lower === guard;
      if (token && guardOk && token.used_at === null) {
        token.used_at = Number(now);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.includes('t.token_hash = ?') && sql.includes('t.attempt_count < ?') && sql.includes('SET used_at = ?')) {
      const [now, email, hash, currentNow, maxAttempts] = this.params;
      const activeId = this.db.active.get(String(email))?.active_token_id;
      const token = activeId ? this.db.tokens.get(activeId) : null;
      if (
        token &&
        token.token_hash === hash &&
        token.used_at === null &&
        token.expires_at > Number(currentNow) &&
        token.attempt_count < Number(maxAttempts)
      ) {
        token.used_at = Number(now);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.includes('t.token_hash = ?') && sql.includes('t.attempt_count >= ?')) {
      const [now, email, hash, currentNow, maxAttempts] = this.params;
      const activeId = this.db.active.get(String(email))?.active_token_id;
      const token = activeId ? this.db.tokens.get(activeId) : null;
      if (
        token &&
        token.token_hash === hash &&
        token.used_at === null &&
        token.expires_at > Number(currentNow) &&
        token.attempt_count >= Number(maxAttempts)
      ) {
        token.used_at = Number(now);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (/SET\s+attempt_count\s*=\s*attempt_count\s*\+\s*1/.test(sql)) {
      const [id, attemptedHash, currentNow, maxAttempts] = this.params;
      const token = this.db.tokens.get(String(id));
      if (
        token &&
        token.token_hash !== attemptedHash &&
        token.used_at === null &&
        token.expires_at > Number(currentNow) &&
        token.attempt_count < Number(maxAttempts)
      ) {
        token.attempt_count += 1;
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.includes('t.attempt_count >= ?') && sql.includes('SET used_at = ?')) {
      const [now, email, currentNow, maxAttempts] = this.params;
      const activeId = this.db.active.get(String(email))?.active_token_id;
      const token = activeId ? this.db.tokens.get(activeId) : null;
      if (
        token &&
        token.used_at === null &&
        token.expires_at > Number(currentNow) &&
        token.attempt_count >= Number(maxAttempts)
      ) {
        token.used_at = Number(now);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    return { meta: { changes: 0 } };
  }
}

function pickRow(row: TokenRecord): OtpTokenRow {
  return {
    id: row.id,
    email_lower: row.email_lower,
    purpose: row.purpose,
    consent_payload_json: row.consent_payload_json,
    next_url: row.next_url,
  };
}

function makeEnv(db = new MemoryD1()): Env {
  return {
    DB: db as unknown as D1Database,
    RATE_LIMIT: undefined as unknown as KVNamespace,
    BRAND_ID: 'lifeplus',
    APP_URL: 'https://www.lifeflow360.app/app/',
    ALLOWED_ORIGINS: 'https://www.lifeflow360.app',
    PADDLE_ENV: 'sandbox',
    PADDLE_PRICE_MONTHLY: 'pri_monthly',
    PADDLE_PRICE_HALFYEAR: 'pri_halfyear',
    PADDLE_PRICE_YEARLY: 'pri_yearly',
    COOKIE_DOMAIN: '.lifeflow360.app',
    SESSION_TTL_DAYS: '30',
    OTP_TTL_MINUTES: '15',
    DEVICE_LIMIT: '3',
    MAIL_FROM: 'no-reply@lifeflow360.app',
    MAIL_FROM_NAME: 'LifeFlow360',
    PADDLE_API_KEY: 'paddle',
    PADDLE_WEBHOOK_SECRET: 'secret',
    APP_SESSION_SECRET: 'session-secret',
    OTP_HASH_SECRET: 'otp-secret',
    RESEND_API_KEY: 'resend',
  };
}

const request = new Request('https://api.test/auth', {
  headers: { 'cf-connecting-ip': '127.0.0.1', 'user-agent': 'vitest' },
});

describe('OTP token storage', () => {
  it('consumes the active token once', async () => {
    const db = new MemoryD1();
    const env = makeEnv(db);
    const email = 'dao@example.com';
    const hash = await hashOtpCode(env, email, '123456');
    await createOtpToken(env, email, hash, 'login', null, null, 2_000, 1_000, request);

    const first = await consumeOtpToken(env, email, '123456', 1_100);
    const second = await consumeOtpToken(env, email, '123456', 1_200);

    expect(first?.status).toBe('ok');
    expect(second?.status).toBe('invalid');
  });

  it('invalidates only the previous active token on re-issue', async () => {
    const db = new MemoryD1();
    const env = makeEnv(db);
    const email = 'dao@example.com';
    await createOtpToken(env, email, await hashOtpCode(env, email, '111111'), 'login', null, null, 2_000, 1_000, request);
    await createOtpToken(env, email, await hashOtpCode(env, email, '222222'), 'login', null, null, 2_000, 1_010, request);

    const oldAttempt = await consumeOtpToken(env, email, '111111', 1_100);
    const active = await consumeOtpToken(env, email, '222222', 1_110);

    const activeToken = db.tokens.get(db.active.get(email)!.active_token_id)!;
    expect(oldAttempt.status).toBe('invalid');
    expect(activeToken.attempt_count).toBe(0);
    expect(active.status).toBe('ok');
  });

  it('locks a token after five wrong attempts and reports locked for the correct code', async () => {
    const db = new MemoryD1();
    const env = makeEnv(db);
    const email = 'dao@example.com';
    await createOtpToken(env, email, await hashOtpCode(env, email, '123456'), 'login', null, null, 2_000, 1_000, request);

    for (let i = 0; i < 5; i += 1) {
      expect((await consumeOtpToken(env, email, '000000', 1_100 + i)).status).toBe('invalid');
    }

    const activeToken = db.tokens.get(db.active.get(email)!.active_token_id)!;
    expect(activeToken.attempt_count).toBe(5);
    expect((await consumeOtpToken(env, email, '123456', 1_200)).status).toBe('locked');
  });
});
