// Cloudflare Pages Functions environment.
// Bindings configured in wrangler.toml and the Pages dashboard.

export interface Env {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;

  BRAND_ID: string;
  APP_URL: string;
  ALLOWED_ORIGINS: string;
  PADDLE_ENV: 'sandbox' | 'live';
  PADDLE_PRICE_MONTHLY: string;
  PADDLE_PRICE_HALFYEAR: string;
  PADDLE_PRICE_YEARLY: string;
  COOKIE_DOMAIN: string;
  SESSION_TTL_DAYS: string;
  OTP_TTL_MINUTES: string;
  CONSENT_DOCUMENT_VERSION?: string;
  DEVICE_LIMIT: string;
  MAIL_FROM: string;
  MAIL_FROM_NAME: string;

  PADDLE_API_KEY: string;
  PADDLE_WEBHOOK_SECRET: string;
  APP_SESSION_SECRET: string;
  OTP_HASH_SECRET?: string;
  RESEND_API_KEY: string;
  DIAGNOSTIC_TOKEN?: string;
  PUBLIC_PRODUCTION?: string;

  // Local-dev override (.dev.vars): wenn '1' werden Session-Cookies ohne
  // Secure-Flag gesetzt, damit sie ueber http://localhost akzeptiert werden.
  // Production immer leer/unset.
  INSECURE_COOKIES?: string;

  // Local-dev OTP helper. Production immer leer/unset.
  DEV_OTP_DEBUG?: string;
}
