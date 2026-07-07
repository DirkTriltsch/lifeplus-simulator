import type { Env } from '../../env';
import { requireSession } from '../../_lib/auth';
import { paddleListSubscriptionTransactions, PaddleApiError } from '../../_lib/paddle';
import { error, json, methodNotAllowed } from '../../_lib/responses';

// Liefert die letzten N Transactions (Rechnungen) der aktuellen
// Subscription. Wird auf "Mein Konto" als Rechnungs-Liste angezeigt.
// Default: 5; max 50.
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  const ctx = await requireSession(request, env);
  if (ctx instanceof Response) return ctx;

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  const url = new URL(request.url);
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '5', 10);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 5;

  const sub = await env.DB.prepare(
    `SELECT paddle_subscription_id FROM subscriptions
       WHERE user_id = ? AND brand_id = ? AND paddle_subscription_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(ctx.user.id, env.BRAND_ID)
    .first<{ paddle_subscription_id: string }>();

  if (!sub?.paddle_subscription_id) {
    return json({ items: [] });
  }

  try {
    const items = await paddleListSubscriptionTransactions(
      env,
      sub.paddle_subscription_id,
      limit,
    );
    return json({ items });
  } catch (err) {
    if (err instanceof PaddleApiError) {
      console.warn('payments_paddle_error', {
        status: err.status,
        code:   err.code,
        detail: err.detail,
      });
      return error(502, 'paddle_lookup_failed');
    }
    throw err;
  }
};
