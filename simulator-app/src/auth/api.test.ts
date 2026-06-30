import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestOtpCode, verifyOtpCode } from './api';

describe('auth api OTP endpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests an OTP code instead of a magic link', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestOtpCode('dao@example.com')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/request-code',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'dao@example.com' }),
      }),
    );
  });

  it('verifies an OTP code with email and code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, sessionKind: 'normal', nextUrl: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyOtpCode('dao@example.com', '123456')).resolves.toMatchObject({
      ok: true,
      sessionKind: 'normal',
      nextUrl: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/verify-code',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'dao@example.com', code: '123456' }),
      }),
    );
  });
});
