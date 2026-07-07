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
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

// Phase 2.3 — Pre-Checkout-Intent + Server-side Intent-Persistierung.
// Mit B2B-Pivot v6: validiert vollstaendige Rechnungsdaten, erstellt eine
// Paddle Transaction serverseitig (Paddle Billing API) und gibt die
// transactionId an den Client zurueck. Der Client oeffnet das Inline-Iframe
// via Paddle.Checkout.open({ transactionId }).
//
// Architektur siehe _doc/paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md.
// Pflicht-Logging (Legal-Review Finding 7) wird im Intent persistiert; der
// Webhook reicht es spaeter ins consent_log durch.

interface Body {
  plan?: string;
  checkoutEmail?: string;
  companyName?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  discountCode?: string | null;
  vatId?: string | null;
  b2bConfirmation?: {
    checked?: boolean;
    version?: string;
    displayedHintsHash?: string;
  };
  consent?: {
    agb?: boolean;
    privacy?: boolean;
    newsletter?: boolean;
    withdrawal_waiver?: boolean;
    version?: string;
    timestamp?: string;
  };
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const VAT_RX = /^[A-Z]{2}[A-Z0-9]{8,12}$/;
const ALLOWED_PLANS = ['monthly', 'halfyear', 'yearly'] as const;
type PlanKey = (typeof ALLOWED_PLANS)[number];
const ALLOWED_COUNTRIES = new Set([
  'DE','AT','CH',
  'BE','BG','HR','CY','CZ','DK','EE','ES','FI','FR','GR','HU','IE','IT',
  'LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK',
]);
const COMPANY_MIN = 2;
const COMPANY_MAX = 200;
const STREET_MIN = 3;
const POSTAL_MIN = 3;
const CITY_MIN = 2;
const DISCOUNT_MAX = 40;
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
  const planRaw = (body.plan ?? '').trim();
  if (!(ALLOWED_PLANS as readonly string[]).includes(planRaw)) {
    return json({ action: 'invalid_plan', brandId: env.BRAND_ID });
  }
  const plan = planRaw as PlanKey;
  const priceId = priceIdForPlan(env, plan);
  if (!priceId) {
    console.warn('checkout_intent_missing_price_id', { plan });
    return json({ action: 'invalid_plan', brandId: env.BRAND_ID });
  }

  // 2. E-Mail
  const checkoutEmail = (body.checkoutEmail ?? '').trim().toLowerCase();
  if (!checkoutEmail || !EMAIL_RX.test(checkoutEmail) || checkoutEmail.length > 254) {
    return error(400, 'invalid_email');
  }

  // 3. Rechnungsempfaenger (v6-Pflichtfelder)
  const companyName = (body.companyName ?? '').trim();
  if (companyName.length < COMPANY_MIN || companyName.length > COMPANY_MAX) {
    return error(400, 'invalid_company_name');
  }
  const street = (body.street ?? '').trim();
  if (street.length < STREET_MIN) return error(400, 'invalid_street');
  const postalCode = (body.postalCode ?? '').trim();
  if (postalCode.length < POSTAL_MIN) return error(400, 'invalid_postal_code');
  const city = (body.city ?? '').trim();
  if (city.length < CITY_MIN) return error(400, 'invalid_city');
  const countryCode = (body.countryCode ?? '').trim().toUpperCase();
  if (!ALLOWED_COUNTRIES.has(countryCode)) return error(400, 'invalid_country');

  // 4. Optionale Rabatt/VAT
  const discountRaw = (body.discountCode ?? '').trim().toUpperCase();
  if (discountRaw.length > DISCOUNT_MAX) return error(400, 'invalid_discount_code');
  const discountCode = discountRaw.length > 0 ? discountRaw : null;

  const vatRaw = (body.vatId ?? '').replace(/\s/g, '').toUpperCase();
  if (vatRaw.length > 0 && !VAT_RX.test(vatRaw)) return error(400, 'invalid_vat_id');
  const vatId = vatRaw.length > 0 ? vatRaw : null;

  // 5. B2B-Bestaetigung Pflicht (Beweislast — Legal-Review Finding 7)
  const confirmationChecked = body.b2bConfirmation?.checked === true;
  const confirmationVersion = (body.b2bConfirmation?.version ?? '').trim();
  const displayedHintsHash  = (body.b2bConfirmation?.displayedHintsHash ?? '').trim();
  if (!confirmationChecked || !confirmationVersion || !displayedHintsHash) {
    return error(400, 'missing_b2b_confirmation');
  }
  if (body.consent?.agb !== true || body.consent?.privacy !== true) {
    return error(400, 'missing_required_consent');
  }

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
    companyName,
    street,
    postalCode,
    city,
    countryCode,
    discountCode,
    vatId,
    b2bConfirmationVersion:   confirmationVersion,
    displayedHintsHash,
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
      companyName,
      address: {
        countryCode,
        postalCode,
        firstLine: street,
        city,
      },
      vatId,
      discountCode,
      priceId,
      customData: {
        brand_id:       env.BRAND_ID,
        intent_id:      intentId,
        checkout_email: checkoutEmail,
        plan,
        consent: {
          agb:                       true,
          privacy:                   true,
          newsletter:                body.consent?.newsletter === true,
          withdrawal_waiver:         false,
          version:                   body.consent?.version ?? 'unknown',
          timestamp:                 body.consent?.timestamp ?? new Date(now).toISOString(),
          b2b_confirmation:          true,
          b2b_confirmation_version:  confirmationVersion,
          displayed_hints_hash:      displayedHintsHash,
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
    discountCode,
    intentId,
    priceId,
    checkoutEmail,
    sessionUserId,
    brandId:       env.BRAND_ID,
  });
};
