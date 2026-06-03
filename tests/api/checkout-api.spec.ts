import { expect, test, type APIRequestContext } from '@playwright/test';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, any>;

const REQUEST_TIMEOUT_MS = Number(process.env.CHECKOUT_REQUEST_TIMEOUT_MS ?? '60000');

interface StartedCheckout {
  intentId: string;
  transactionId: string;
  checkoutEmail: string;
  data: JsonObject;
}

const WRITE_TESTS = process.env.CHECKOUT_WRITE_TESTS === '1';
const DIAGNOSTIC_TOKEN = process.env.CHECKOUT_DIAGNOSTIC_TOKEN ?? '';
const TARGET = process.env.CHECKOUT_TARGET ?? 'sandbox';
const DEFAULT_DISCOUNT = process.env.CHECKOUT_TEST_DISCOUNT ?? 'DAO20';
const FULL_DISCOUNT = process.env.CHECKOUT_TEST_FULL_DISCOUNT ?? 'EARLY2026';
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdCheckouts: StartedCheckout[] = [];

test.describe.configure({ mode: 'serial' });

test.describe('LifePlus checkout API smoke', () => {
  test.afterEach(async ({ request }) => {
    while (createdCheckouts.length > 0) {
      const checkout = createdCheckouts.pop();
      if (!checkout) continue;
      await cancelCheckout(request, checkout).catch((err) => {
        console.warn('cleanup_cancel_failed', checkout.transactionId, err);
      });
    }
  });

  test('diagnostic price configuration is present when diagnostic token is available', async ({ request }) => {
    test.skip(!DIAGNOSTIC_TOKEN, 'Set CHECKOUT_DIAGNOSTIC_TOKEN to verify deployed Paddle price env vars.');

    const { status, data } = await getJson(request, '/api/diagnostics/paddle-prices', {
      'x-diagnostic-token': DIAGNOSTIC_TOKEN,
    });

    expect(status, JSON.stringify(data, null, 2)).toBe(200);
    expect(data.ok, JSON.stringify(data, null, 2)).toBe(true);
    expect(data.environment).toBe(TARGET === 'prod' ? 'live' : 'sandbox');
    for (const plan of ['monthly', 'halfyear', 'yearly']) {
      const price = data.prices?.[plan] as JsonObject | undefined;
      expect(price?.configured, `${plan} price configured`).toBe(true);
      expect(price?.looksLikePriceId, `${plan} price id shape`).toBe(true);
    }
  });

  test('pricing preview covers country tax and discount read path', async ({ request }) => {
    const cases = [
      { name: 'DE no discount', body: { plan: 'halfyear', countryCode: 'DE' }, expectDiscount: false },
      { name: 'DE DAO20', body: { plan: 'halfyear', countryCode: 'DE', discountCode: DEFAULT_DISCOUNT }, expectDiscount: true },
      { name: 'AT DAO20', body: { plan: 'halfyear', countryCode: 'AT', discountCode: DEFAULT_DISCOUNT }, expectDiscount: true },
      { name: 'DE full discount', body: { plan: 'halfyear', countryCode: 'DE', discountCode: FULL_DISCOUNT }, expectDiscount: true },
    ];

    const results = await Promise.all(
      cases.map(async (c) => ({
        ...c,
        result: await postJson(request, '/api/billing/preview-pricing', c.body),
      })),
    );

    for (const c of results) {
      const { status, data } = c.result;
      expect(status, `${c.name}\n${JSON.stringify(data, null, 2)}`).toBe(200);
      expect(data.ok, `${c.name}\n${JSON.stringify(data, null, 2)}`).toBe(true);
      expect(data.discountApplied, c.name).toBe(c.expectDiscount);
      expect(data.discountError, c.name).toBeNull();
      expectMoneyString(data.totals?.subtotal, `${c.name} subtotal`);
      expectMoneyString(data.totals?.tax, `${c.name} tax`);
      expectMoneyString(data.totals?.total, `${c.name} total`);
      if (c.expectDiscount) expect(Number(data.totals?.discount ?? '0')).toBeGreaterThan(0);
    }
  });

  test('pricing preview reports invalid discount without false green state', async ({ request }) => {
    const { status, data } = await postJson(request, '/api/billing/preview-pricing', {
      plan: 'halfyear',
      countryCode: 'DE',
      discountCode: `NOPE-${RUN_ID}`,
    });

    expect(status, JSON.stringify(data, null, 2)).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.discountApplied).toBe(false);
    expect(String(data.discountError ?? '')).toContain('Rabattcode');
    expectMoneyString(data.totals?.total, 'fallback total without invalid discount');
  });

  test('input validation catches local UX validation cases before Paddle', async ({ request }) => {
    await test.step('preview invalid country', async () => {
      const { status, data } = await postJson(request, '/api/billing/preview-pricing', {
        plan: 'halfyear',
        countryCode: 'XX',
      });
      expect(status).toBe(400);
      expect(data.error?.code).toBe('invalid_country');
    });

    await test.step('checkout invalid VAT format', async () => {
      const { status, data } = await postJson(request, '/api/billing/checkout-intent', {
        ...baseIntent('invalid-vat'),
        vatId: 'AT123',
      });
      expect(status).toBe(400);
      expect(data.error?.code).toBe('invalid_vat_id');
    });

    await test.step('checkout missing required consent', async () => {
      const body = baseIntent('missing-consent') as JsonObject;
      body.consent = { agb: true, privacy: false, version: 'api-smoke', timestamp: new Date().toISOString() };
      const { status, data } = await postJson(request, '/api/billing/checkout-intent', body);
      expect(status).toBe(400);
      expect(data.error?.code).toBe('missing_required_consent');
    });
  });

  test('guest checkout creates and cancels Paddle transaction for the default DE flow', async ({ request }) => {
    test.skip(!WRITE_TESTS, 'Set CHECKOUT_WRITE_TESTS=1 to create and cancel Paddle sandbox transactions.');

    const checkout = await startCheckout(request, baseIntent('de-default'));
    expect(checkout.data.action).toBe('start_checkout');
    expect(checkout.data.sessionUserId).toBeNull();
    expect(checkout.data.discountCode).toBeNull();
    expectMoneyString((checkout.data.totals as JsonObject | null)?.total, 'transaction total');

    const cancel = await cancelCheckout(request, checkout);
    expect(cancel.status, JSON.stringify(cancel.data, null, 2)).toBe(200);
    expect(cancel.data.ok, JSON.stringify(cancel.data, null, 2)).toBe(true);
  });

  test('guest checkout applies DAO20 and supports Daten aendern cancellation', async ({ request }) => {
    test.skip(!WRITE_TESTS, 'Set CHECKOUT_WRITE_TESTS=1 to create and cancel Paddle sandbox transactions.');

    const checkout = await startCheckout(request, {
      ...baseIntent('de-discount'),
      discountCode: DEFAULT_DISCOUNT,
    });
    expect(checkout.data.action).toBe('start_checkout');
    expect(checkout.data.discountCode).toBe(DEFAULT_DISCOUNT);
    expect(Number((checkout.data.totals as JsonObject | null)?.discount ?? '0')).toBeGreaterThan(0);

    const cancel = await cancelCheckout(request, checkout);
    expect(cancel.status, JSON.stringify(cancel.data, null, 2)).toBe(200);
    expect(cancel.data.ok, JSON.stringify(cancel.data, null, 2)).toBe(true);
  });

  test('guest checkout covers AT VAT business path and discount combination', async ({ request }) => {
    test.skip(!WRITE_TESTS, 'Set CHECKOUT_WRITE_TESTS=1 to create and cancel Paddle sandbox transactions.');

    const cases = [
      {
        name: 'AT VAT only',
        body: atIntent('at-vat', { vatId: 'AT12345678' }),
      },
      {
        name: 'AT VAT plus DAO20',
        body: atIntent('at-vat-discount', { vatId: 'AT12345678', discountCode: DEFAULT_DISCOUNT }),
      },
      {
        name: 'DE full discount',
        body: baseIntent('de-full-discount', { discountCode: FULL_DISCOUNT }),
      },
    ];

    for (const c of cases) {
      await test.step(c.name, async () => {
        const checkout = await startCheckout(request, c.body);
        expect(checkout.data.action).toBe('start_checkout');
        expect(checkout.transactionId).toMatch(/^txn_/);
        expectMoneyString((checkout.data.totals as JsonObject | null)?.total, `${c.name} total`);
        if (c.body.discountCode) {
          expect(Number((checkout.data.totals as JsonObject | null)?.discount ?? '0')).toBeGreaterThan(0);
        }
      });
    }
  });

  test('post-checkout rejects unpaid transactions instead of silently succeeding', async ({ request }) => {
    test.skip(!WRITE_TESTS, 'Set CHECKOUT_WRITE_TESTS=1 to create and cancel Paddle sandbox transactions.');

    const checkout = await startCheckout(request, baseIntent('post-unpaid'));
    const { status, data } = await postJson(request, '/api/billing/post-checkout', {
      checkoutEmail: checkout.checkoutEmail,
      intentId: checkout.intentId,
      transactionId: checkout.transactionId,
    });

    expect(status, JSON.stringify(data, null, 2)).toBe(409);
    expect(data.error?.code).toBe('transaction_not_paid');
  });
});

async function getJson(
  request: APIRequestContext,
  path: string,
  headers?: Record<string, string>,
): Promise<{ status: number; data: JsonObject }> {
  const res = await request.get(path, { headers, timeout: REQUEST_TIMEOUT_MS });
  return { status: res.status(), data: await parseJsonObject(res) };
}

async function postJson(
  request: APIRequestContext,
  path: string,
  body: JsonObject,
): Promise<{ status: number; data: JsonObject }> {
  const res = await request.post(path, { data: body, timeout: REQUEST_TIMEOUT_MS });
  return { status: res.status(), data: await parseJsonObject(res) };
}

async function parseJsonObject(res: { text(): Promise<string> }): Promise<JsonObject> {
  const text = await res.text();
  try {
    const parsed = text ? JSON.parse(text) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { value: parsed };
  } catch {
    return { text };
  }
}

async function startCheckout(request: APIRequestContext, body: JsonObject): Promise<StartedCheckout> {
  const { status, data } = await postJson(request, '/api/billing/checkout-intent', body);
  expect(status, JSON.stringify(data, null, 2)).toBe(200);
  expect(data.action, JSON.stringify(data, null, 2)).toBe('start_checkout');
  expect(String(data.intentId ?? '')).toMatch(/^[0-9a-f-]{36}$/);
  expect(String(data.transactionId ?? '')).toMatch(/^txn_/);

  const checkout = {
    intentId: String(data.intentId),
    transactionId: String(data.transactionId),
    checkoutEmail: String(body.checkoutEmail),
    data,
  };
  createdCheckouts.push(checkout);
  return checkout;
}

async function cancelCheckout(
  request: APIRequestContext,
  checkout: StartedCheckout,
): Promise<{ status: number; data: JsonObject }> {
  const idx = createdCheckouts.findIndex((c) => c.intentId === checkout.intentId);
  if (idx >= 0) createdCheckouts.splice(idx, 1);
  return postJson(request, '/api/billing/cancel-checkout-intent', {
    intentId: checkout.intentId,
    transactionId: checkout.transactionId,
  });
}

function baseIntent(label: string, overrides: JsonObject = {}): JsonObject {
  return {
    plan: 'halfyear',
    checkoutEmail: `api-smoke+${RUN_ID}-${label}@lifeflow360.app`,
    companyName: `LifePlus API Smoke ${label}`,
    street: 'Teststrasse 1',
    postalCode: '10115',
    city: 'Berlin',
    countryCode: 'DE',
    b2bConfirmation: {
      checked: true,
      version: 'b2b-v2026-06-02',
      displayedHintsHash: 'hints-v2026-06-02',
    },
    consent: {
      agb: true,
      privacy: true,
      newsletter: false,
      withdrawal_waiver: false,
      version: 'api-smoke-v1',
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

function atIntent(label: string, overrides: JsonObject = {}): JsonObject {
  return baseIntent(label, {
    street: 'Testgasse 1',
    postalCode: '1010',
    city: 'Wien',
    countryCode: 'AT',
    ...overrides,
  });
}

function expectMoneyString(value: JsonValue | undefined, label: string): void {
  expect(value, label).toBeTruthy();
  expect(String(value), label).toMatch(/^\d+$/);
}
