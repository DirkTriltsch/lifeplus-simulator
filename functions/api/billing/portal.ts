import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';

interface PortalSessionResponse {
  data?: { urls?: { general?: { overview?: string } } };
}

// Creates a Paddle Customer Portal session for the logged-in user and returns
// the URL. The frontend redirects the browser to that URL.
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'unauthenticated');

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'unauthenticated');

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  const customer = await env.DB.prepare(
    `SELECT paddle_customer_id FROM subscriptions
       WHERE user_id = ? AND paddle_customer_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(ctx.user.id)
    .first<{ paddle_customer_id: string }>();

  if (!customer?.paddle_customer_id) return error(404, 'no_customer');

  const apiBase =
    env.PADDLE_ENV === 'live'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';

  const res = await fetch(
    `${apiBase}/customers/${encodeURIComponent(customer.paddle_customer_id)}/portal-sessions`,
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
