import type { Env } from '../../env';
import { requireSession } from '../../_lib/auth';
import {
  paddleCancelSubscription,
  paddleResumeSubscription,
  PaddleApiError,
} from '../../_lib/paddle';
import { error, json, methodNotAllowed } from '../../_lib/responses';

// Plant Kuendigung der aktuellen Subscription zum Ende der bezahlten
// Laufzeit (B2B-Standard, kein Refund). Mit { undo: true } im Body wird
// eine bereits geplante Kuendigung wieder rueckgaengig gemacht.
//
// Der finale Status (canceled / scheduled_change auf null) kommt
// asynchron via subscription.updated-Webhook in unsere DB. Das Frontend
// rendert die Antwort hier optimistisch sofort.
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const ctx = await requireSession(request, env);
  if (ctx instanceof Response) return ctx;

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  let undo = false;
  try {
    const body = (await request.json().catch(() => null)) as { undo?: boolean } | null;
    undo = body?.undo === true;
  } catch {
    /* empty body = cancel */
  }

  const sub = await env.DB.prepare(
    `SELECT paddle_subscription_id, status FROM subscriptions
       WHERE user_id = ? AND brand_id = ? AND paddle_subscription_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(ctx.user.id, env.BRAND_ID)
    .first<{ paddle_subscription_id: string; status: string }>();

  if (!sub?.paddle_subscription_id) return error(409, 'no_subscription');
  if (sub.status === 'canceled') return error(409, 'already_canceled');

  try {
    if (undo) {
      await paddleResumeSubscription(env, sub.paddle_subscription_id);
      return json({ ok: true, scheduledChange: null });
    }
    const scheduled = await paddleCancelSubscription(env, sub.paddle_subscription_id);
    return json({ ok: true, scheduledChange: scheduled });
  } catch (err) {
    if (err instanceof PaddleApiError) {
      console.warn('cancel_subscription_paddle_error', {
        userId: ctx.user.id,
        subId:  sub.paddle_subscription_id,
        status: err.status,
        code:   err.code,
        detail: err.detail,
        undo,
      });
      return error(502, 'paddle_cancel_failed');
    }
    throw err;
  }
};
