import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { randomId } from '../../_lib/crypto';
import {
  createCheckoutIntent,
  getEntitlementForBrand,
  isEntitlementActive,
  setCheckoutIntentPaddleTransaction,
} from '../../_lib/db';
import {
  PaddleApiError,
  paddleCreateB2BTransaction,
} from '../../_lib/paddle';
import {
  parsePlan,
  validateCheckoutIntentBody,
  type CheckoutIntentBody,
  type PlanKey,
} from '../../_lib/checkout-validation';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

// Phase 2.3 — Pre-Checkout-Intent + Server-side Intent-Persistierung.
// Validiert die Rechnungsdaten (Verbraucher oder Unternehmer, siehe
// _lib/checkout-validation.ts), erstellt eine Paddle Transaction serverseitig
// (Paddle Billing API) und gibt die transactionId an den Client zurueck. Der
// Client oeffnet das Inline-Iframe via Paddle.Checkout.open({ transactionId }).
//
// Architektur siehe _doc/paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md.
// Pflicht-Logging (Legal-Review Finding 7) wird im Intent persistiert; der
// Webhook reicht es spaeter ins consent_log durch.

type Body = CheckoutIntentBody;

const INTENT_TTL_MS = 30 * 60_000;

function priceIdForPlan(env: Env, plan: PlanKey): string | undefined {
  if (plan === 'monthly')  return env.PADDLE_PRICE_MONTHLY;
  if (plan === 'halfyear') return env.PADDLE_PRICE_HALFYEAR;
  if (plan === 'yearly')   return env.PADDLE_PRICE_YEARLY;
  return undefined;
}

// Mappt Paddle-API-Fehler auf benutzerfreundliche Field-Errors fuer das UI.
function mapPaddleErrorToField(err: PaddleApiError): { field: string | null; message: string } {
  // Bekannte Faelle, die wir spezifisch melden
  if (err.code === 'discount_not_found') {
    return { field: 'discount', message: err.detail };
  }
  if (err.code === 'config_missing') {
    return { field: null, message: 'Paddle ist auf dem Server nicht konfiguriert.' };
  }
  // Field-Errors aus dem Paddle-Response auswerten
  for (const fe of err.fieldErrors) {
    if (fe.field.startsWith('tax_identifier') || fe.field.includes('tax')) {
      return { field: 'vat', message: 'USt-IdNr ist ungueltig: ' + fe.message };
    }
    if (fe.field.startsWith('postal_code')) {
      return { field: 'postalCode', message: 'PLZ ist ungueltig: ' + fe.message };
    }
    if (fe.field.startsWith('country_code')) {
      return { field: 'country', message: 'Land ist ungueltig: ' + fe.message };
    }
    if (fe.field.startsWith('first_line') || fe.field.startsWith('street')) {
      return { field: 'street', message: 'Strasse ist ungueltig: ' + fe.message };
    }
    if (fe.field.startsWith('city')) {
      return { field: 'city', message: 'Ort ist ungueltig: ' + fe.message };
    }
    if (fe.field.startsWith('email')) {
      return { field: 'email', message: 'E-Mail ist ungueltig: ' + fe.message };
    }
  }
  return { field: null, message: err.detail };
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  // 1. Plan + priceId
  const plan = parsePlan(body.plan);
  if (!plan) {
    return json({ action: 'invalid_plan', brandId: env.BRAND_ID });
  }
  const priceId = priceIdForPlan(env, plan);
  if (!priceId) {
    console.warn('checkout_intent_missing_price_id', { plan });
    return json({ action: 'invalid_plan', brandId: env.BRAND_ID });
  }

  // 2. E-Mail, Rechnungsempfaenger, Rabatt/USt-IdNr, Consents
  const validated = validateCheckoutIntentBody(body);
  if (!validated.ok) return error(400, validated.error);
  const v = validated.value;
  const checkoutEmail = v.checkoutEmail;

  const ip = clientIp(request);
  if (!ip) return error(429, 'rate_limited');
  const ipLimit = await consumeRateLimit(env, `rl:billing:checkout-intent:ip:${ip}`, 10, 600, {
    failMode: 'closed',
  });
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  // 6. Session optional (v6.1 Gast-Checkout). Wenn Session da ist, nutzen
  //    wir die userId fuer Vor-Verknuepfung und pruefen aktive Abos. Wenn
  //    nicht, laeuft der Intent als Gast → userId bleibt NULL und der
  //    Auto-Login im post-checkout legt Konto + Session an.
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  const ctx = token ? await loadSessionFromToken(env, token) : null;

  let sessionUserId: string | null = null;
  if (ctx) {
    sessionUserId = ctx.user.id;

    // Wenn eingeloggter User die fremde Email kauft → blockieren (Anti-Misuse
    // fuer eingeloggte Kunden). Gast-Checkouter koennen jede Email tippen
    // — das ist ihr eigenes Risiko.
    const sessionEmail = ctx.user.email.toLowerCase();
    if (sessionEmail !== checkoutEmail) {
      return json({
        action: 'email_mismatch',
        checkoutEmail,
        sessionUserId,
        brandId: env.BRAND_ID,
      });
    }

    // Aktive bezahlte Sub → Portal-Redirect
    const hasOpenSub = await env.DB.prepare(
      `SELECT id, status FROM subscriptions
         WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due')
         LIMIT 1`,
    )
      .bind(ctx.user.id)
      .first<{ id: string; status: string }>();
    if (hasOpenSub) {
      return json({
        action: 'manage_subscription',
        priceId, checkoutEmail, sessionUserId, brandId: env.BRAND_ID,
      });
    }

    // Aktives One-Shot → already_paid
    const entitlement = await getEntitlementForBrand(env, ctx.user.id, env.BRAND_ID);
    if (
      entitlement &&
      isEntitlementActive(entitlement, nowMs()) &&
      entitlement.source === 'one_shot_purchase'
    ) {
      return json({
        action: 'already_paid',
        priceId, checkoutEmail, sessionUserId, brandId: env.BRAND_ID,
      });
    }
  }

  // 7. Intent anlegen — VOR Paddle-API, damit wir die intent_id schon haben
  //    fuer customData (Webhook-Verifizierung).
  const intentId = randomId();
  const now = nowMs();
  const userAgent = request.headers.get('user-agent');
  await createCheckoutIntent(env, {
    id:                       intentId,
    userId:                   sessionUserId,
    brandId:                  env.BRAND_ID,
    plan,
    priceId,
    checkoutEmail,
    buyerType:                v.buyerType,
    companyName:              v.companyName,
    billingName:              v.billingName,
    street:                   v.street,
    postalCode:               v.postalCode,
    city:                     v.city,
    countryCode:              v.countryCode,
    discountCode:             v.discountCode,
    vatId:                    v.vatId,
    b2bConfirmationVersion:   v.b2bConfirmationVersion,
    displayedHintsHash:       v.displayedHintsHash,
    ipAddress: ip,
    userAgent,
    now,
    ttlMs:                    INTENT_TTL_MS,
  });

  // 11. Paddle-Transaction erstellen (customer + address + business + discount)
  let transactionId: string;
  let paddleTotals: unknown = null;
  try {
    const result = await paddleCreateB2BTransaction(env, {
      email:        checkoutEmail,
      companyName:  v.displayName,
      address: {
        countryCode: v.countryCode,
        postalCode:  v.postalCode,
        firstLine:   v.street,
        city:        v.city,
      },
      vatId:        v.vatId,
      discountCode: v.discountCode,
      priceId,
      customData: {
        brand_id:       env.BRAND_ID,
        intent_id:      intentId,
        checkout_email: checkoutEmail,
        plan,
        consent: {
          agb:                       true,
          privacy:                   true,
          newsletter:                v.newsletter,
          withdrawal_waiver:         v.withdrawalWaiver,
          version:                   v.consentVersion ?? 'unknown',
          timestamp:                 v.consentTimestamp ?? new Date(now).toISOString(),
          buyer_type:                v.buyerType,
          b2b_confirmation:          v.buyerType === 'business',
          b2b_confirmation_version:  v.b2bConfirmationVersion,
          displayed_hints_hash:      v.displayedHintsHash,
        },
      },
    });
    transactionId = result.transactionId;
    paddleTotals = result.totals;
    await setCheckoutIntentPaddleTransaction(env, intentId, transactionId);
  } catch (err) {
    if (err instanceof PaddleApiError) {
      const mapped = mapPaddleErrorToField(err);
      console.warn('paddle_transaction_create_failed', {
        intentId,
        path:       err.path,
        status:     err.status,
        code:       err.code,
        detail:     err.detail,
        fieldErrors: err.fieldErrors,
        body:       err.rawBody,
      });
      const userDetail = err.fieldErrors.length > 0
        ? mapped.message
        : `${err.detail} (Paddle ${err.status} auf ${err.path})` +
          (err.rawBody ? ` — ${err.rawBody}` : '');
      return json({
        action:      'paddle_error',
        errorCode:   err.code,
        errorDetail: userDetail,
        errorField:  mapped.field,
        errorPath:   err.path,
        errorBody:   err.rawBody,
        brandId:     env.BRAND_ID,
      });
    }
    console.error('paddle_transaction_create_unexpected', err);
    return json({
      action:      'paddle_error',
      errorCode:   'unknown',
      errorDetail: 'Unerwarteter Fehler bei der Paddle-Anbindung. Bitte erneut versuchen.',
      errorField:  null,
      brandId:     env.BRAND_ID,
    });
  }

  return json({
    action:        'start_checkout',
    transactionId,
    totals: paddleTotals,
    discountCode:  v.discountCode,
    intentId,
    priceId,
    checkoutEmail,
    sessionUserId,
    brandId:       env.BRAND_ID,
  });
};
