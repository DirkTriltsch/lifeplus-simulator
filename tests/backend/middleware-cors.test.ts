import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../functions/env';
import { onRequest } from '../../functions/_middleware';

function env(): Env {
  return {
    ALLOWED_ORIGINS: 'https://www.lifeflow360.app',
  } as Env;
}

describe('API middleware CORS', () => {
  it('keeps CORS headers on uncaught handler exceptions', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await onRequest({
      request: new Request('https://api.lifeflow360.app/api/account', {
        headers: { origin: 'https://www.lifeflow360.app' },
      }),
      env: env(),
      next: async () => {
        throw new Error('boom');
      },
    } as unknown as Parameters<typeof onRequest>[0]);

    expect(response.status).toBe(500);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://www.lifeflow360.app');
    expect(await response.json()).toEqual({ error: { code: 'internal_error', message: 'internal_error' } });
    error.mockRestore();
  });
});
