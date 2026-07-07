import type { Env } from '../../env';
import {
  PaddleApiError,
  paddleFindDiscountByCode,
  paddlePricePreview,
} from '../../_lib/paddle';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';

// v6.1 Live-Preview-Endpoint fuer die Bestelluebersicht.
//
// Aufgerufen vom Frontend bei Discount-„Anwenden" und Land-Wechsel. Liefert
// die Paddle-berechneten Totals zurueck, damit die linke Spalte den finalen
// Betrag schon VOR dem Klick auf "Weiter zur Zahlung" anzeigt.
//
// Limitation: Reverse-Charge ist nicht im Preview enthalten, weil
// Paddle's /pricing-preview keine inline business akzeptiert. Reverse-Charge
// wird erst beim finalen Transaction-Create in Step 2 angewendet. Das
// Frontend zeigt einen entsprechenden Hinweis.

interface Body {
  plan?: string;
  countryCode?: string;
  discountCode?: string | null;
}

const ALLOWED_PLANS = ['monthly', 'halfyear', 'yearly'] as const;
type PlanKey = (typeof ALLOWED_PLANS)[number];
const ALLOWED_COUNTRIES = new Set([
  'DE','AT','CH',
  'BE','BG','HR','CY','CZ','DK','EE','ES','FI','FR','GR','HU','IE','IT',
  'LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK',
]);
const DISCOUNT_MAX = 40;

function priceIdForPlan(env: Env, plan: PlanKey): string | undefined {
  if (plan === 'monthly')  return env.PADDLE_PRICE_MONTHLY;
  if (plan === 'halfyear') return env.PADDLE_PRICE_HALFYEAR;
  if (plan === 'yearly')   return env.PADDLE_PRICE_YEARLY;
  return undefined;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const planRaw = (body.plan ?? '').trim();
  if (!(ALLOWED_PLANS as readonly string[]).includes(planRaw)) {
    return error(400, 'invalid_plan');
  }
  const plan = planRaw as PlanKey;
  const priceId = priceIdForPlan(env, plan);
  if (!priceId) return error(500, 'price_id_missing');

  const countryCode = (body.countryCode ?? '').trim().toUpperCase();
  if (!ALLOWED_COUNTRIES.has(countryCode)) return error(400, 'invalid_country');

  const discountRaw = (body.discountCode ?? '').trim().toUpperCase();
  if (discountRaw.length > DISCOUNT_MAX) return error(400, 'invalid_discount_code');
  const discountCode = discountRaw.length > 0 ? discountRaw : null;

  // Rate-Limit: 30 Calls pro IP pro 5 Minuten — generoeser als andere
  // Endpoints, weil Live-Preview natuerlich oft feuert (z.B. Land-Wechsel
  // ueber das Dropdown).
  const ip = clientIp(request);
  const ipLimit = await consumeRateLimit(
    env,
    ip ? `rl:billing:preview:ip:${ip}` : 'rl:billing:preview:ip:missing-cf-ip',
    30,
    300,
    { failMode: 'open' },
  );
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  // Discount aufloesen (falls Code da). Bei Discount-Nicht-bekannt geben wir
  // eine spezifische Antwort, damit das Frontend nur das Rabattcode-Feld
  // markiert — Preview ohne Discount wird zusaetzlich abgegeben, damit die
  // Anzeige nicht leer bleibt.
  let discountId: string | null = null;
  let discountError: string | null = null;
  if (discountCode) {
    try {
      const discount = await paddleFindDiscountByCode(env, discountCode);
      if (!discount) {
        discountError = `Rabattcode "${discountCode}" ist Paddle nicht bekannt.`;
      } else {
        discountId = discount.id;
      }
    } catch (err) {
      if (err instanceof PaddleApiError) {
        console.warn('preview_discount_lookup_failed', {
          path: err.path, status: err.status, code: err.code, detail: err.detail,
        });
        return error(502, 'paddle_unreachable');
      }
      throw err;
    }
  }

  try {
    const preview = await paddlePricePreview(env, {
      priceId,
      quantity:    1,
      countryCode,
      discountId:  discountId ?? undefined,
    });
    return json({
      ok:           true,
      plan,
      countryCode,
      discountCode,
      discountError,                       // null wenn alles OK
      discountApplied:    discountId !== null,
      totals:             preview,
    });
  } catch (err) {
    if (err instanceof PaddleApiError) {
      console.warn('preview_pricing_failed', {
        path: err.path, status: err.status, code: err.code, detail: err.detail,
        body: err.rawBody,
      });
      return error(502, 'paddle_unreachable');
    }
    console.error('preview_pricing_unexpected', err);
    return error(500, 'preview_failed');
  }
};
