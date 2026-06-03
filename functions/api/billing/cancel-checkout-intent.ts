import type { Env } from '../../env';
import { getCheckoutIntentById } from '../../_lib/db';
import { PaddleApiError, paddleCancelTransaction } from '../../_lib/paddle';
import { error, json, methodNotAllowed } from '../../_lib/responses';

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

  const intent = await getCheckoutIntentById(env, intentId);
  if (!intent || intent.brand_id !== env.BRAND_ID) {
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
      return json({ ok: false, error: err.code });
    }
    console.warn('paddle_cancel_transaction_unexpected', err);
    return json({ ok: false, error: 'unknown' });
  }

  return json({ ok: true });
};
