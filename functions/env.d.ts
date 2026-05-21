// Cloudflare Pages Functions environment.
// Bindings configured in wrangler.toml and the Pages dashboard.

export interface Env {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;

  BRAND_ID: string;
  APP_URL: string;
  PADDLE_ENV: 'sandbox' | 'live';
  COOKIE_DOMAIN: string;
  SESSION_TTL_DAYS: string;
  MAGIC_LINK_TTL_MINUTES: string;
  DEVICE_LIMIT: string;
  MAIL_FROM: string;
  MAIL_FROM_NAME: string;

  PADDLE_API_KEY: string;
  PADDLE_WEBHOOK_SECRET: string;
  APP_SESSION_SECRET: string;
  MAGIC_LINK_SECRET: string;
  RESEND_API_KEY: string;
}
