import type { Env } from '../../env';
import { requireSession } from '../../_lib/auth';
import {
  paddleGetTransactionInvoiceUrl,
  paddleGetTransactionRaw,
  PaddleApiError,
} from '../../_lib/paddle';
import { error, methodNotAllowed } from '../../_lib/responses';

// Loest die signierte Paddle-Invoice-PDF-URL fuer eine Transaction auf
// und redirected den Browser dorthin. Wir holen sie nicht beim
// payments-Listing, damit die Liste guenstig bleibt (1 Paddle-Call statt
// 1+N) — Lazy-Fetch erst beim Klick.
//
// Ownership-Check: bevor wir redirecten, lesen wir die Transaction von
// Paddle und vergleichen customer_id mit der des Users. Verhindert,
// dass ein eingeloggter User mit fremder txn_id Rechnungen abgreift.
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  const ctx = await requireSession(request, env);
  if (ctx instanceof Response) return ctx;

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  const url = new URL(request.url);
  const txnId = url.searchParams.get('txn');
  if (!txnId || !/^txn_[A-Za-z0-9]+$/.test(txnId)) {
    return error(400, 'invalid_txn');
  }

  // User-Customer-IDs aus D1. Eine Sub kann unterwegs den customer_id
  // wechseln (Re-Issue), darum sammeln wir alle bisher gesehenen IDs.
  const customerRows = await env.DB.prepare(
    `SELECT DISTINCT paddle_customer_id FROM subscriptions
       WHERE user_id = ? AND brand_id = ? AND paddle_customer_id IS NOT NULL`,
  )
    .bind(ctx.user.id, env.BRAND_ID)
    .all<{ paddle_customer_id: string }>();

  const userCustomerIds = new Set(
    (customerRows.results ?? []).map((r) => r.paddle_customer_id),
  );
  if (userCustomerIds.size === 0) return error(404, 'no_customer');

  try {
    const txn = await paddleGetTransactionRaw(env, txnId);
    if (!txn) return error(404, 'invoice_not_found');
    if (!txn.customerId || !userCustomerIds.has(txn.customerId)) {
      // Wir loggen das bewusst — Indicator fuer Enumeration-Versuche.
      console.warn('invoice_ownership_mismatch', {
        userId:       ctx.user.id,
        requestedTxn: txnId,
        txnCustomer:  txn.customerId,
      });
      return error(403, 'invoice_forbidden');
    }

    const invoiceUrl = await paddleGetTransactionInvoiceUrl(env, txnId);
    if (!invoiceUrl) return error(502, 'invoice_url_missing');

    return new Response(null, {
      status: 302,
      headers: {
        location:        invoiceUrl,
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof PaddleApiError) {
      console.warn('invoice_paddle_error', {
        status: err.status,
        code:   err.code,
        detail: err.detail,
      });
      return error(502, 'paddle_lookup_failed');
    }
    throw err;
  }
};
