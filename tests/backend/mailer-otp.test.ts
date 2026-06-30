import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendOtpCode } from '../../functions/_lib/mailer';
import type { Env } from '../../functions/env';

function env(overrides: Partial<Env> = {}): Env {
  return {
    DB: undefined as unknown as D1Database,
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
    ...overrides,
  };
}

describe('sendOtpCode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses local debug mode in production', async () => {
    await expect(
      sendOtpCode(env({ DEV_OTP_DEBUG: '1', PUBLIC_PRODUCTION: '1' }), {
        to: 'dao@example.com',
        code: '123456',
        purpose: 'login',
      }),
    ).rejects.toThrow('dev_debug_in_production');
  });

  it('sends the code in the body but not in the subject', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    await sendOtpCode(env(), {
      to: 'dao@example.com',
      code: '123456',
      purpose: 'free_signup',
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      subject: string;
      text: string;
      html: string;
    };
    expect(body.subject).toContain('LifeFlow360');
    expect(body.subject).not.toContain('123456');
    expect(body.text).toContain('123456');
    expect(body.html).toContain('123456');
  });
});
