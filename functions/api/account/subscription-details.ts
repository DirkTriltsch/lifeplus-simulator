import type { Env } from '../../env';
import { requireSession } from '../../_lib/auth';
import { paddleGetSubscriptionDetails, PaddleApiError } from '../../_lib/paddle';
import { error, json, methodNotAllowed } from '../../_lib/responses';

// Liefert Detail-Daten zur aktuellen Subscription des Users, die wir auf
// "Mein Konto" direkt anzeigen (Hybrid-Variante 2 — Daten on-domain,
// Karten-Wechsel weiterhin via Paddle-Portal-Deep-Link).
//
// Quelle: D1 fuer subscription_id, dann Live-Lookup gegen Paddle. Wir
// cachen bewusst nicht — bei B2B-Volumen passt das in Paddle's Rate-Limit
// und der User sieht immer den aktuellen Stand (z.B. nach Karten-Wechsel
// im Paddle-Portal ohne Webhook-Verzoegerung).
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  const ctx = await requireSession(request, env);
  if (ctx instanceof Response) return ctx;

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  const sub = await env.DB.prepare(
    `SELECT paddle_subscription_id FROM subscriptions
       WHERE user_id = ? AND brand_id = ? AND paddle_subscription_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(ctx.user.id, env.BRAND_ID)
    .first<{ paddle_subscription_id: string }>();

  if (!sub?.paddle_subscription_id) {
    // User hat keine Sub (Free / Trial / Lifetime). Wir antworten mit 200 +
    // leerem Body, damit das Frontend die Sektion einfach ausblenden kann.
    return json({ subscription: null });
  }

  try {
    const details = await paddleGetSubscriptionDetails(env, sub.paddle_subscription_id);
    return json({ subscription: details });
  } catch (err) {
    if (err instanceof PaddleApiError) {
      console.warn('subscription_details_paddle_error', {
        status: err.status,
        code:   err.code,
        detail: err.detail,
      });
      return error(502, 'paddle_lookup_failed');
    }
    throw err;
  }
};
