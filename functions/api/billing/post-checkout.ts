import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE, sessionCookieHeader } from '../../_lib/cookies';
import {
  getCheckoutIntentById,
  setCheckoutIntentUserId,
  upsertUserByEmail,
} from '../../_lib/db';
import {
  PaddleApiError,
  paddleGetTransaction,
} from '../../_lib/paddle';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import {
  createSessionForNewDevice,
  loadSessionFromToken,
} from '../../_lib/session';
import { nowMs } from '../../_lib/time';

// v6.1 Post-Checkout — Auto-Login nach Paddle-Zahlung (Gast-Checkout-Flow).
//
// Aufgerufen vom Frontend nach Paddle's checkout.completed-Event. Aufgaben:
//   1. Intent + Transaction-Match validieren (Anti-Manipulation).
//   2. Paddle-API: Transaction-Status verifizieren (Option B — paranoid).
//   3. User per E-Mail finden oder neu anlegen.
//   4. Intent.user_id setzen (idempotent, falls noch NULL).
//   5. Session anlegen + Cookie setzen → User ist eingeloggt.
//   6. Response: { ok, mailSent:false, redirectUrl }.
//
// Entitlement-Grant macht der Webhook (subscription.created /
// transaction.paid). Nach diesem Endpoint hat der User eine Session, aber
// die App muss /api/me pollen, bis das Pro-Entitlement aktiv ist.

interface Body {
  checkoutEmail?: string;
  intentId?: string;
  transactionId?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PAID_TX_STATUSES = new Set(['completed', 'paid', 'billed']);

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  // 1. Eingaben validieren
  const checkoutEmail = (body.checkoutEmail ?? '').trim().toLowerCase();
  if (!checkoutEmail || !EMAIL_RX.test(checkoutEmail) || checkoutEmail.length > 254) {
    return error(400, 'invalid_email');
  }
  const intentId = (body.intentId ?? '').trim();
  const transactionId = (body.transactionId ?? '').trim();
  if (!intentId || !transactionId) return error(400, 'missing_intent_or_transaction');

  // 2. Rate-Limit pro IP — verhindert Brute-Force auf gueltige Intent/TX-Paare
  const ip = clientIp(request);
  if (!ip) return error(429, 'rate_limited');
  const ipLimit = await consumeRateLimit(env, `rl:billing:post-checkout:ip:${ip}`, 10, 600, {
    failMode: 'closed',
  });
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  // 3. Intent laden + Brand-Match + checkoutEmail-Match + Transaction-Match
  const intent = await getCheckoutIntentById(env, intentId);
  if (!intent) return error(404, 'intent_not_found');
  if (intent.brand_id !== env.BRAND_ID) return error(404, 'intent_not_found');
  if (intent.checkout_email.toLowerCase() !== checkoutEmail) {
    console.warn('post_checkout_email_mismatch', {
      intentId,
      intentEmail: intent.checkout_email,
      bodyEmail:   checkoutEmail,
    });
    return error(409, 'email_mismatch');
  }
  if (intent.paddle_transaction_id !== transactionId) {
    console.warn('post_checkout_transaction_mismatch', {
      intentId,
      intentTransactionId: intent.paddle_transaction_id,
      bodyTransactionId:   transactionId,
    });
    return error(409, 'transaction_mismatch');
  }

  // 4. Paddle-API: Transaction-Status muss "bezahlt" sein. Schuetzt vor
  //    gefakten Post-Checkout-Calls bei nicht abgeschlossener Zahlung.
  let paddleStatus: string;
  try {
    const tx = await paddleGetTransaction(env, transactionId);
    paddleStatus = tx.status;
  } catch (err) {
    if (err instanceof PaddleApiError) {
      console.warn('post_checkout_paddle_get_failed', {
        transactionId, code: err.code, detail: err.detail, status: err.status,
      });
      return error(502, 'paddle_unreachable');
    }
    console.error('post_checkout_paddle_get_unexpected', err);
    return error(502, 'paddle_unreachable');
  }
  if (!PAID_TX_STATUSES.has(paddleStatus)) {
    console.warn('post_checkout_transaction_not_paid', { transactionId, paddleStatus });
    return error(409, 'transaction_not_paid');
  }

  // 5. Bestehende Session pruefen — wenn der User schon eingeloggt ist und
  //    die Email matched, ueberspringen wir die Neu-Login-Logik und melden
  //    nur „weiter zur App". So sind Bestandskunden mit Session nahtlos.
  const cookies = parseCookies(request.headers.get('cookie'));
  const existingToken = cookies[SESSION_COOKIE];
  const existingCtx = existingToken ? await loadSessionFromToken(env, existingToken) : null;
  const sameUser = existingCtx && existingCtx.user.email.toLowerCase() === checkoutEmail;

  // 6. User anlegen / finden — auch wenn schon Session da, sicher upserten.
  const now = nowMs();
  const user = await upsertUserByEmail(env, checkoutEmail, now, () => crypto.randomUUID());

  // Intent.user_id verbinden (idempotent — UPDATE ... WHERE user_id IS NULL).
  if (intent.user_id === null) {
    await setCheckoutIntentUserId(env, intentId, user.id);
  }

  // 7. Wenn schon Session da ist UND korrekt fuer diesen User, dann
  //    KEINE neue Session anlegen — einfach durchwinken.
  if (sameUser) {
    return json({
      ok:           true,
      mailSent:     false,
      redirectUrl:  appRedirectUrl(env),
      message:      `Bezahlung erfolgreich. Du wirst gleich in die App weitergeleitet.`,
    });
  }

  // 8. Neue Session anlegen + Cookie setzen
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;
  const session = await createSessionForNewDevice(env, {
    userId:    user.id,
    userAgent,
    kind:      'normal',
  });
  const cookie = sessionCookieHeader(
    env,
    session.sessionToken,
    Math.max(60, Math.floor((session.expiresAt - nowMs()) / 1000)),
  );

  return json(
    {
      ok:          true,
      mailSent:    false,
      redirectUrl: appRedirectUrl(env),
      message:     `Bezahlung erfolgreich. Du wirst gleich in die App weitergeleitet.`,
    },
    { headers: { 'set-cookie': cookie } },
  );
};

function trimSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function appRedirectUrl(env: Env): string {
  return trimSlash(env.APP_URL || '/app/') + '/';
}
