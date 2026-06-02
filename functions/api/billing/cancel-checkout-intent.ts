import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { getCheckoutIntentById } from '../../_lib/db';
import { PaddleApiError, paddleCancelTransaction } from '../../_lib/paddle';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';

interface Body {
  intentId?: string;
  transactionId?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const intentId = (body.intentId ?? '').trim();
  const transactionId = (body.transactionId ?? '').trim();
  if (!intentId || !transactionId) return error(400, 'missing_fields');

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'login_required');
  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'login_required');

  const intent = await getCheckoutIntentById(env, intentId);
  if (!intent || intent.brand_id !== env.BRAND_ID || intent.user_id !== ctx.user.id) {
    return error(404, 'intent_not_found');
  }
  if (intent.consumed_at !== null) return json({ ok: true, skipped: 'consumed' });
  if (intent.paddle_transaction_id !== transactionId) {
    return error(400, 'transaction_mismatch');
  }

  try {
    await paddleCancelTransaction(env, transactionId);
  } catch (err) {
    if (err instanceof PaddleApiError) {
      console.warn('paddle_cancel_transaction_failed', {
        intentId,
        transactionId,
        status: err.status,
        code: err.code,
        detail: err.detail,
      });
      return json({ ok: false, error: err.code }, 200);
    }
    console.warn('paddle_cancel_transaction_unexpected', err);
    return json({ ok: false, error: 'unknown' }, 200);
  }

  return json({ ok: true });
};
