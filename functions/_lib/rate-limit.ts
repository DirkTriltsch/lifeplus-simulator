import type { Env } from '../env';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

// Token-bucket-light: fixed window in KV.
// key e.g. "rl:auth:request-link:ip:1.2.3.4"
export async function consumeRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!env.RATE_LIMIT) {
    // No KV bound (e.g. local dev). Fail open but log once.
    return { allowed: true, remaining: limit, resetAtMs: Date.now() + windowSeconds * 1000 };
  }

  const now = Date.now();
  const raw = await env.RATE_LIMIT.get(key);
  let count = 0;
  let windowStart = now;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { count: number; windowStart: number };
      if (now - parsed.windowStart < windowSeconds * 1000) {
        count = parsed.count;
        windowStart = parsed.windowStart;
      }
    } catch {
      // Ignore bad cache value.
    }
  }

  count += 1;
  const allowed = count <= limit;

  await env.RATE_LIMIT.put(
    key,
    JSON.stringify({ count, windowStart }),
    { expirationTtl: windowSeconds + 5 },
  );

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    resetAtMs: windowStart + windowSeconds * 1000,
  };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
