import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';

interface PortalSessionResponse {
  data?: { urls?: { general?: { overview?: string } } };
}

interface CustomerListResponse {
  data?: Array<{ id?: string; email?: string }>;
}

// Creates a Paddle Customer Portal session for the logged-in user and returns
// the URL. The frontend redirects the browser to that URL.
//
// Lookup chain:
//   1. paddle_customer_id from subscriptions table (D1)
//   2. fall back to Paddle Customer list by email (covers users whose
//      subscription webhook never landed, e.g. due to early-setup races)
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'unauthenticated');

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'unauthenticated');

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  const apiBase =
    env.PADDLE_ENV === 'live'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';

  let customerId: string | null = null;

  const cached = await env.DB.prepare(
    `SELECT paddle_customer_id FROM subscriptions
       WHERE user_id = ? AND paddle_customer_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(ctx.user.id)
    .first<{ paddle_customer_id: string }>();

  if (cached?.paddle_customer_id) {
    customerId = cached.paddle_customer_id;
  } else {
    customerId = await findPaddleCustomerByEmail(env, apiBase, ctx.user.email);
  }

  if (!customerId) return error(404, 'no_customer');

  const res = await fetch(
    `${apiBase}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.PADDLE_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return error(502, 'paddle_portal_failed', body.slice(0, 200));
  }

  const data = (await res.json()) as PortalSessionResponse;
  const url = data.data?.urls?.general?.overview;
  if (!url) return error(502, 'paddle_portal_url_missing');

  return json({ url });
};

async function findPaddleCustomerByEmail(
  env: Env,
  apiBase: string,
  email: string,
): Promise<string | null> {
  const url = `${apiBase}/customers?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });

  if (!res.ok) {
    console.warn('paddle_customer_lookup_failed', res.status, await res.text().catch(() => ''));
    return null;
  }

  const data = (await res.json()) as CustomerListResponse;
  const match = data.data?.find((c) => c.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}
