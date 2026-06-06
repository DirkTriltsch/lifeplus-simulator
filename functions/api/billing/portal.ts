import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';

// Aktionen, die wir per Deep-Link auf das Paddle Customer Portal anbieten.
// Pro Aktion mappt der Server auf eine andere URL aus der Portal-Session-Response:
//   overview        → urls.general.overview
//   payment_method  → urls.subscriptions[0].update_subscription_payment_method
//   cancel          → urls.subscriptions[0].cancel_subscription
type PortalAction = 'overview' | 'payment_method' | 'cancel';

interface PortalSubscriptionLinks {
  id?: string;
  cancel_subscription?: string;
  update_subscription_payment_method?: string;
}

interface PortalSessionResponse {
  data?: {
    urls?: {
      general?: { overview?: string };
      subscriptions?: PortalSubscriptionLinks[];
    };
  };
}

interface CustomerListResponse {
  data?: Array<{ id?: string; email?: string }>;
}

// Erstellt eine Paddle Customer Portal Session fuer den eingeloggten User und
// liefert die passende URL zurueck. Der Browser leitet auf diese URL um
// (Option B aus design concepts/mein-konto-paddle-portal-options.html).
//
// Lookup-Kette:
//   1. paddle_customer_id + paddle_subscription_id aus subscriptions (D1)
//   2. Fallback: Paddle Customer per E-Mail suchen (Bestands-User, deren
//      subscription-Webhook nie ankam, z.B. bei early-setup races).
//
// Aktion via ?action=overview|payment_method|cancel (default: overview).
// Deep-Links zu konkreten Subscription-Aktionen brauchen subscription_ids
// im Request-Body — wir liefern deshalb genau die aktuelle Sub mit.
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'unauthenticated');

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'unauthenticated');

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  const url = new URL(request.url);
  const action = parseAction(url.searchParams.get('action'));

  const apiBase =
    env.PADDLE_ENV === 'live'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';

  let customerId: string | null = null;
  let subscriptionId: string | null = null;

  const sub = await env.DB.prepare(
    `SELECT paddle_customer_id, paddle_subscription_id FROM subscriptions
       WHERE user_id = ? AND paddle_customer_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(ctx.user.id)
    .first<{ paddle_customer_id: string; paddle_subscription_id: string | null }>();

  if (sub?.paddle_customer_id) {
    customerId = sub.paddle_customer_id;
    subscriptionId = sub.paddle_subscription_id;
  } else {
    customerId = await findPaddleCustomerByEmail(env, apiBase, ctx.user.email);
  }

  if (!customerId) return error(404, 'no_customer');

  // Wenn der User keine Subscription hat, kann er nur die Uebersicht oeffnen.
  // Cancel/Payment-Method-Deep-Links setzen subscription_ids voraus.
  if ((action === 'cancel' || action === 'payment_method') && !subscriptionId) {
    return error(409, 'no_subscription');
  }

  const body: Record<string, unknown> = {};
  if (subscriptionId) body.subscription_ids = [subscriptionId];

  const res = await fetch(
    `${apiBase}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.PADDLE_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return error(502, 'paddle_portal_failed', text.slice(0, 200));
  }

  const data = (await res.json()) as PortalSessionResponse;
  const urls = data.data?.urls;
  const subLinks = subscriptionId
    ? urls?.subscriptions?.find((s) => s.id === subscriptionId) ?? urls?.subscriptions?.[0]
    : undefined;

  let targetUrl: string | undefined;
  switch (action) {
    case 'cancel':
      targetUrl = subLinks?.cancel_subscription;
      break;
    case 'payment_method':
      targetUrl = subLinks?.update_subscription_payment_method;
      break;
    case 'overview':
    default:
      targetUrl = urls?.general?.overview;
      break;
  }

  if (!targetUrl) return error(502, 'paddle_portal_url_missing');

  return json({ url: targetUrl, action });
};

function parseAction(raw: string | null): PortalAction {
  if (raw === 'cancel' || raw === 'payment_method' || raw === 'overview') return raw;
  return 'overview';
}

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
