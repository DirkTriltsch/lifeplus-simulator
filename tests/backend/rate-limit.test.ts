import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../functions/env';
import { clientIp, consumeRateLimit } from '../../functions/_lib/rate-limit';

function envWithRateLimit(rateLimit: Partial<KVNamespace> | undefined, overrides: Partial<Env> = {}): Env {
  return {
    RATE_LIMIT: rateLimit as KVNamespace,
    ...overrides,
  } as Env;
}

describe('rate limiting', () => {
  it('uses only Cloudflare connecting IP and fails closed when it is missing', () => {
    const request = new Request('https://api.test/', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    expect(clientIp(request)).toBeNull();
  });

  it('fails closed when configured and KV is unbound', async () => {
    const result = await consumeRateLimit(envWithRateLimit(undefined), 'rl:test', 5, 60, {
      failMode: 'closed',
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('fails open when configured and KV is unbound', async () => {
    const result = await consumeRateLimit(envWithRateLimit(undefined), 'rl:test', 5, 60, {
      failMode: 'open',
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('fails closed in production when KV is unbound even if the route is fail-open', async () => {
    const result = await consumeRateLimit(
      envWithRateLimit(undefined, { PUBLIC_PRODUCTION: '1' }),
      'rl:test',
      5,
      60,
      { failMode: 'open' },
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('fails closed on KV errors for sensitive routes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const get = vi.fn().mockRejectedValue(new Error('kv unavailable'));
    const put = vi.fn();
    const result = await consumeRateLimit(envWithRateLimit({ get, put }), 'rl:test', 5, 60, {
      failMode: 'closed',
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(put).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
