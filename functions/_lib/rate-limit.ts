import type { Env } from '../env';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

export type RateLimitFailMode = 'open' | 'closed';

export interface RateLimitOptions {
  failMode?: RateLimitFailMode;
}

// Token-bucket-light: fixed window in KV.
// key e.g. "rl:auth:request-code:ip:1.2.3.4"
export async function consumeRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const failMode = options.failMode ?? 'open';
  const now = Date.now();
  const resetAtMs = now + windowSeconds * 1000;

  if (!env.RATE_LIMIT) {
    const effectiveFailMode = env.PUBLIC_PRODUCTION === '1' ? 'closed' : failMode;
    return rateLimitFailureResult(limit, resetAtMs, effectiveFailMode);
  }

  try {
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
  } catch (err) {
    console.warn('rate_limit_kv_error', { key, failMode, err });
    return rateLimitFailureResult(limit, resetAtMs, failMode);
  }
}

export function clientIp(request: Request): string | null {
  return request.headers.get('cf-connecting-ip');
}

function rateLimitFailureResult(
  limit: number,
  resetAtMs: number,
  failMode: RateLimitFailMode,
): RateLimitResult {
  if (failMode === 'closed') {
    return { allowed: false, remaining: 0, resetAtMs };
  }
  return { allowed: true, remaining: limit, resetAtMs };
}
