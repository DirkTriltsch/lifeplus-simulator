import type { Env } from '../env';

// Server-side Paddle API helper fuer den B2B-Checkout. Verwendet wird das
// Paddle Billing API (api.paddle.com / sandbox-api.paddle.com).
//
// Verwendung im Checkout-Intent-Flow (siehe
// _doc/paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md):
//   1. paddleFindOrCreateCustomer(email, name)         → customer_id
//   2. paddleCreateCustomerAddress(customer_id, addr)  → address_id
//   3. paddleCreateCustomerBusiness(...)               → business_id (opt.)
//   4. paddleFindDiscountByCode(code)                  → discount_id (opt.)
//   5. paddleCreateTransaction({ customer_id, address_id, ... })
//      → { transaction_id }
//
// Fehlerbehandlung: jede Funktion wirft PaddleApiError. Das checkout-intent.ts
// faengt die Errors und mappt sie auf konkrete Frontend-Meldungen.

export class PaddleApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly detail: string;
  public readonly fieldErrors: Array<{ field: string; message: string }>;
  public readonly path: string;
  public readonly rawBody: string;

  constructor(
    status: number,
    code: string,
    detail: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
    path = '',
    rawBody = '',
  ) {
    super(`paddle_api_error ${status} ${code} on ${path}: ${detail}`);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    this.path = path;
    this.rawBody = rawBody;
  }
}

function paddleApiBase(env: Env): string {
  return env.PADDLE_ENV === 'live'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
}

interface PaddleErrorBody {
  error?: {
    type?: string;
    code?: string;
    detail?: string;
    errors?: Array<{ field?: string; message?: string }>;
  };
}

async function paddleRequest<T>(
  env: Env,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!env.PADDLE_API_KEY) {
    throw new PaddleApiError(0, 'config_missing', 'PADDLE_API_KEY is not configured');
  }
  const url = `${paddleApiBase(env)}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      authorization:    `Bearer ${env.PADDLE_API_KEY}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
  if (!res.ok) {
    const err = (parsed as PaddleErrorBody | null)?.error ?? {};
    const fieldErrors = (err.errors ?? [])
      .filter((e) => typeof e.field === 'string' && typeof e.message === 'string')
      .map((e) => ({ field: e.field as string, message: e.message as string }));
    // Wir loggen die volle Response, damit sich Probleme wie "field xyz invalid"
    // ohne weiteres Debugging finden lassen. Die rohe Antwort liegt zusaetzlich
    // im Error fuer Aufrufer, die sie an den Nutzer durchreichen wollen.
    console.warn('paddle_request_failed', {
      method,
      path,
      status: res.status,
      code:   err.code ?? null,
      detail: err.detail ?? null,
      fieldErrors,
      body:   text.slice(0, 800),
    });
    throw new PaddleApiError(
      res.status,
      err.code ?? 'unknown',
      err.detail ?? `Paddle request failed (${res.status})`,
      fieldErrors,
      path,
      text.slice(0, 800),
    );
  }
  return (parsed as { data: T }).data;
}

// ── Customers ────────────────────────────────────────────────

interface PaddleCustomer {
  id: string;
  email: string;
  name: string | null;
  status: string;
}

export async function paddleFindCustomerByEmail(
  env: Env,
  email: string,
): Promise<PaddleCustomer | null> {
  // `email=` ist dokumentiert, wirft in einzelnen Paddle-Sandbox-Accounts
  // aber 400. `search=` ist breiter, daher filtern wir danach lokal exakt.
  const list = await paddleRequest<PaddleCustomer[]>(
    env,
    'GET',
    `/customers?search=${encodeURIComponent(email)}&per_page=200`,
  );
  if (!Array.isArray(list)) return null;
  const exact = list.find(
    (c) => typeof c.email === 'string' &&
           c.email.toLowerCase() === email.toLowerCase() &&
           c.status !== 'archived',
  );
  return exact ?? null;
}

export async function paddleFindOrCreateCustomer(
  env: Env,
  email: string,
  name: string,
): Promise<PaddleCustomer> {
  let existing: PaddleCustomer | null = null;
  try {
    existing = await paddleFindCustomerByEmail(env, email);
  } catch (err) {
    if (err instanceof PaddleApiError && err.status === 400) {
      console.warn('paddle_customer_lookup_skipped', {
        email,
        path: err.path,
        status: err.status,
        code: err.code,
        detail: err.detail,
      });
    } else {
      throw err;
    }
  }
  if (existing) return existing;
  return paddleRequest<PaddleCustomer>(env, 'POST', '/customers', { email, name });
}

// ── Addresses ────────────────────────────────────────────────

export interface PaddleAddressInput {
  countryCode: string;        // ISO-2 (DE/AT/...)
  postalCode?: string;
  firstLine?: string;
  secondLine?: string;
  city?: string;
  region?: string;
}

interface PaddleAddress {
  id: string;
  country_code: string;
}

export async function paddleCreateCustomerAddress(
  env: Env,
  customerId: string,
  input: PaddleAddressInput,
): Promise<PaddleAddress> {
  return paddleRequest<PaddleAddress>(
    env,
    'POST',
    `/customers/${encodeURIComponent(customerId)}/addresses`,
    {
      country_code: input.countryCode,
      postal_code:  input.postalCode,
      first_line:   input.firstLine,
      second_line:  input.secondLine,
      city:         input.city,
      region:       input.region,
    },
  );
}

// ── Businesses ───────────────────────────────────────────────

interface PaddleBusiness {
  id: string;
  name: string;
  tax_identifier: string | null;
}

export async function paddleCreateCustomerBusiness(
  env: Env,
  customerId: string,
  name: string,
  taxIdentifier: string,
): Promise<PaddleBusiness> {
  return paddleRequest<PaddleBusiness>(
    env,
    'POST',
    `/customers/${encodeURIComponent(customerId)}/businesses`,
    { name, tax_identifier: taxIdentifier },
  );
}

// ── Discounts ────────────────────────────────────────────────

interface PaddleDiscount {
  id: string;
  status: string;
  code: string | null;
}

export async function paddleFindDiscountByCode(
  env: Env,
  code: string,
): Promise<PaddleDiscount | null> {
  // `code=` ist dokumentiert, kann in Sandbox aber 400 liefern. Die Default-
  // Liste ist active-scoped; wir filtern lokal auf exakten Code-Match.
  const list = await paddleRequest<PaddleDiscount[]>(
    env,
    'GET',
    '/discounts?per_page=200',
  );
  if (!Array.isArray(list)) return null;
  const exact = list.find(
    (d) => (d.code ?? '').toUpperCase() === code.toUpperCase() && d.status === 'active',
  );
  return exact ?? null;
}

// ── Transactions ─────────────────────────────────────────────

export interface PaddleTransactionInput {
  priceId: string;
  quantity: number;
  customerId: string;
  addressId: string;
  businessId?: string;
  discountId?: string;
  customData?: Record<string, unknown>;
  currencyCode?: string;
}

interface PaddleTransaction {
  id: string;
  status: string;
  customer_id: string;
  address_id: string | null;
  business_id: string | null;
  discount_id: string | null;
  details?: {
    totals?: PaddleTransactionTotals;
  } | null;
}

export interface PaddleTransactionTotals {
  subtotal?: string;
  discount?: string;
  tax?: string;
  total?: string;
  currency_code?: string;
}

export async function paddleCreateTransaction(
  env: Env,
  input: PaddleTransactionInput,
): Promise<PaddleTransaction> {
  return paddleRequest<PaddleTransaction>(env, 'POST', '/transactions', {
    items: [{ price_id: input.priceId, quantity: input.quantity }],
    customer_id:    input.customerId,
    address_id:     input.addressId,
    business_id:    input.businessId,
    discount_id:    input.discountId,
    custom_data:    input.customData,
    currency_code:  input.currencyCode ?? 'EUR',
    collection_mode: 'automatic',
  });
}

export async function paddleCancelTransaction(
  env: Env,
  transactionId: string,
): Promise<PaddleTransaction> {
  return paddleRequest<PaddleTransaction>(
    env,
    'PATCH',
    `/transactions/${encodeURIComponent(transactionId)}`,
    { status: 'canceled' },
  );
}

// ── Pricing Preview ──────────────────────────────────────────
// Server-seitiger Preview-Aufruf fuer Discount + Country-Tax (Bug 1+2 Fix).
// Verwendet POST /pricing-preview — schlanker als Transaction-Preview und
// braucht keine vorab angelegten Entities.
//
// Limitation: Paddle's Pricing-Preview unterstuetzt KEINE inline business
// object. Reverse-Charge-Preview ist deshalb nicht moeglich. Wir geben
// dafuer nur den Country-Tax zurueck — Reverse-Charge wird erst im finalen
// Transaction-Create (Step 2) angewendet.

export interface PaddlePricePreviewInput {
  priceId: string;
  quantity: number;
  countryCode: string;
  discountId?: string;
  currencyCode?: string;
}

export interface PaddlePricePreviewResult {
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  total: string | null;
  currencyCode: string | null;
  taxRate: string | null;
  formattedTotals: {
    subtotal: string | null;
    discount: string | null;
    tax: string | null;
    total: string | null;
  };
}

interface PaddlePricePreviewResponse {
  details?: {
    line_items?: Array<{
      tax_rate?: string;
      totals?: {
        subtotal?: string;
        discount?: string;
        tax?: string;
        total?: string;
      };
      formatted_totals?: {
        subtotal?: string;
        discount?: string;
        tax?: string;
        total?: string;
      };
    }>;
    totals?: {
      subtotal?: string;
      discount?: string;
      tax?: string;
      total?: string;
      currency_code?: string;
    };
  };
  currency_code?: string;
}

export async function paddlePricePreview(
  env: Env,
  input: PaddlePricePreviewInput,
): Promise<PaddlePricePreviewResult> {
  const body: Record<string, unknown> = {
    items:    [{ price_id: input.priceId, quantity: input.quantity }],
    address:  { country_code: input.countryCode },
    currency_code: input.currencyCode ?? 'EUR',
  };
  if (input.discountId) body.discount_id = input.discountId;

  const res = await paddleRequest<PaddlePricePreviewResponse>(env, 'POST', '/pricing-preview', body);

  const line = res.details?.line_items?.[0];
  const lineTotals = line?.totals ?? {};
  const lineFormatted = line?.formatted_totals ?? {};
  const grandTotals = res.details?.totals ?? {};

  return {
    subtotal: lineTotals.subtotal ?? grandTotals.subtotal ?? null,
    discount: lineTotals.discount ?? grandTotals.discount ?? null,
    tax:      lineTotals.tax      ?? grandTotals.tax      ?? null,
    total:    lineTotals.total    ?? grandTotals.total    ?? null,
    currencyCode: grandTotals.currency_code ?? res.currency_code ?? null,
    taxRate:  line?.tax_rate ?? null,
    formattedTotals: {
      subtotal: lineFormatted.subtotal ?? null,
      discount: lineFormatted.discount ?? null,
      tax:      lineFormatted.tax      ?? null,
      total:    lineFormatted.total    ?? null,
    },
  };
}

// v6.1: post-checkout-Verifizierung. Liest die Transaktion bei Paddle und
// liefert den aktuellen Status zurueck (paid, ready, canceled, completed, ...).
// Wir nutzen das im post-checkout, um sicherzustellen, dass der Auto-Login
// nur dann passiert, wenn Paddle die Zahlung wirklich akzeptiert hat.
export interface PaddleTransactionStatusInfo {
  id: string;
  status: string;
  customerId: string | null;
  invoiceNumber: string | null;
}

export async function paddleGetTransaction(
  env: Env,
  transactionId: string,
): Promise<PaddleTransactionStatusInfo> {
  const tx = await paddleRequest<{
    id: string;
    status: string;
    customer_id: string | null;
    invoice_number: string | null;
  }>(
    env,
    'GET',
    `/transactions/${encodeURIComponent(transactionId)}`,
  );
  return {
    id:             tx.id,
    status:         tx.status,
    customerId:     tx.customer_id,
    invoiceNumber:  tx.invoice_number,
  };
}

// ── Subscription Management (Mein-Konto Hybrid-Variante 2) ───
// Wird auf der "Mein Konto"-Seite verwendet, um Zahlungsdaten und
// Rechnungen direkt auf unserer Domain anzuzeigen (statt komplett auf
// das Paddle-Portal umzuleiten). Karten-Wechsel bleibt aus PCI-Gruenden
// im Paddle-Portal (Deep-Link); alles andere laeuft direkt ueber unsere
// API. Siehe design concepts/mein-konto-paddle-portal-options.html.

export interface PaddleSubscriptionDetails {
  id: string;
  status: string;
  nextBilledAt: string | null;
  scheduledChange: {
    action: string;
    effectiveAt: string;
  } | null;
  nextTransaction: {
    total: string | null;        // in Minor Units ("12000" = 120,00)
    currencyCode: string | null;
    formattedTotal: string | null; // z.B. "$120.00" / "120,00 €"
  } | null;
  paymentMethod: {
    type: string;                // 'card' | 'paypal' | 'apple_pay' | ...
    cardBrand: string | null;    // 'visa' | 'mastercard' | ...
    last4: string | null;
  } | null;
}

interface PaddleSubscriptionRaw {
  id: string;
  status: string;
  next_billed_at: string | null;
  scheduled_change: {
    action?: string;
    effective_at?: string;
  } | null;
  next_transaction?: {
    details?: {
      totals?: {
        total?: string;
        currency_code?: string;
        grand_total?: string;
      };
    };
  } | null;
}

interface PaddleTransactionRaw {
  id: string;
  status: string;
  billed_at: string | null;
  invoice_number: string | null;
  customer_id: string | null;
  subscription_id: string | null;
  origin: string | null;
  details?: {
    totals?: {
      total?: string;
      currency_code?: string;
      grand_total?: string;
    };
  };
  payments?: Array<{
    status?: string;
    method_details?: {
      type?: string;
      card?: {
        type?: string;
        last4?: string;
      };
    };
  }>;
}

// Liefert Subscription-Details inkl. naechstem Zahlungsbetrag. Wir holen
// uns die Zahlungsmethode aus der letzten Captured-Payment-Transaction
// (Paddle gibt sie nicht direkt auf /subscriptions/{id} zurueck — sie
// liegt am letzten transaction.payments[].method_details).
export async function paddleGetSubscriptionDetails(
  env: Env,
  subscriptionId: string,
): Promise<PaddleSubscriptionDetails> {
  const sub = await paddleRequest<PaddleSubscriptionRaw>(
    env,
    'GET',
    `/subscriptions/${encodeURIComponent(subscriptionId)}?include=next_transaction`,
  );

  const totals = sub.next_transaction?.details?.totals ?? {};
  const nextTransaction = (totals.total || totals.grand_total)
    ? {
        total:          totals.total ?? totals.grand_total ?? null,
        currencyCode:   totals.currency_code ?? null,
        formattedTotal: formatMinorAmount(
          totals.total ?? totals.grand_total ?? null,
          totals.currency_code ?? null,
        ),
      }
    : null;

  // Zahlungsmethode aus juengster captured Transaction lesen. Wenn keine
  // existiert (z.B. ganz frische Sub), liefern wir null.
  let paymentMethod: PaddleSubscriptionDetails['paymentMethod'] = null;
  try {
    const txns = await paddleRequest<PaddleTransactionRaw[]>(
      env,
      'GET',
      `/transactions?subscription_id=${encodeURIComponent(subscriptionId)}` +
        `&status=billed,paid,completed&per_page=1&order_by=billed_at[DESC]`,
    );
    const last = Array.isArray(txns) ? txns[0] : null;
    const payment = last?.payments?.find((p) => (p.status ?? '') === 'captured') ?? last?.payments?.[0];
    if (payment?.method_details) {
      paymentMethod = {
        type:       payment.method_details.type ?? 'unknown',
        cardBrand:  payment.method_details.card?.type ?? null,
        last4:      payment.method_details.card?.last4 ?? null,
      };
    }
  } catch (err) {
    // Wenn der Payment-Methods-Lookup scheitert (z.B. Paddle-API-Glitch),
    // brechen wir das Details-Endpoint nicht ab — wir zeigen einfach
    // "Nicht hinterlegt" im Frontend.
    console.warn('paddle_payment_method_lookup_failed', err);
  }

  return {
    id:             sub.id,
    status:         sub.status,
    nextBilledAt:   sub.next_billed_at,
    scheduledChange: sub.scheduled_change?.action && sub.scheduled_change?.effective_at
      ? {
          action:      sub.scheduled_change.action,
          effectiveAt: sub.scheduled_change.effective_at,
        }
      : null,
    nextTransaction,
    paymentMethod,
  };
}

export interface PaddleTransactionListItem {
  id: string;
  status: string;
  billedAt: string | null;
  invoiceNumber: string | null;
  total: string | null;
  currencyCode: string | null;
  formattedTotal: string | null;
  origin: string | null;
}

export async function paddleListSubscriptionTransactions(
  env: Env,
  subscriptionId: string,
  limit: number,
): Promise<PaddleTransactionListItem[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const list = await paddleRequest<PaddleTransactionRaw[]>(
    env,
    'GET',
    `/transactions?subscription_id=${encodeURIComponent(subscriptionId)}` +
      `&per_page=${safeLimit}&order_by=billed_at[DESC]`,
  );
  if (!Array.isArray(list)) return [];
  return list.map((t) => {
    const totals = t.details?.totals ?? {};
    const total = totals.total ?? totals.grand_total ?? null;
    return {
      id:             t.id,
      status:         t.status,
      billedAt:       t.billed_at,
      invoiceNumber:  t.invoice_number,
      total,
      currencyCode:   totals.currency_code ?? null,
      formattedTotal: formatMinorAmount(total, totals.currency_code ?? null),
      origin:         t.origin,
    };
  });
}

// Liefert den signierten Invoice-PDF-Link einer Transaction. Paddle's
// URL ist ~24h gueltig und enthaelt ein eigenes Token — wir muessen sie
// nicht selbst aendern. Aufrufer ist fuer den Ownership-Check zustaendig.
export async function paddleGetTransactionInvoiceUrl(
  env: Env,
  transactionId: string,
): Promise<string | null> {
  const data = await paddleRequest<{ url?: string }>(
    env,
    'GET',
    `/transactions/${encodeURIComponent(transactionId)}/invoice`,
  );
  return data?.url ?? null;
}

// Holt eine einzelne Transaction. Wir nutzen das im invoice-Endpoint, um
// vor dem Redirect zu pruefen, dass die Transaction wirklich dem
// angemeldeten User gehoert (customer_id-Match).
export async function paddleGetTransactionRaw(
  env: Env,
  transactionId: string,
): Promise<{ customerId: string | null; subscriptionId: string | null } | null> {
  try {
    const tx = await paddleRequest<PaddleTransactionRaw>(
      env,
      'GET',
      `/transactions/${encodeURIComponent(transactionId)}`,
    );
    return {
      customerId:     tx.customer_id ?? null,
      subscriptionId: tx.subscription_id ?? null,
    };
  } catch (err) {
    if (err instanceof PaddleApiError && err.status === 404) return null;
    throw err;
  }
}

export interface PaddleScheduledChange {
  action: string;
  effectiveAt: string;
}

// Plant Subscription-Kuendigung. effectiveFrom='next_billing_period' = zum
// Ende der bezahlten Laufzeit (B2B-Standard, kein Refund). 'immediately'
// waere sofort + anteilige Erstattung — wir bieten das im UI nicht an.
export async function paddleCancelSubscription(
  env: Env,
  subscriptionId: string,
  effectiveFrom: 'next_billing_period' | 'immediately' = 'next_billing_period',
): Promise<PaddleScheduledChange | null> {
  const data = await paddleRequest<PaddleSubscriptionRaw>(
    env,
    'POST',
    `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    { effective_from: effectiveFrom },
  );
  if (data.scheduled_change?.action && data.scheduled_change?.effective_at) {
    return {
      action:      data.scheduled_change.action,
      effectiveAt: data.scheduled_change.effective_at,
    };
  }
  return null;
}

// Macht eine geplante Kuendigung rueckgaengig (scheduled_change=null).
export async function paddleResumeSubscription(
  env: Env,
  subscriptionId: string,
): Promise<void> {
  await paddleRequest<PaddleSubscriptionRaw>(
    env,
    'PATCH',
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { scheduled_change: null },
  );
}

// Formatiert "12000" + "EUR" → "120,00 €". Wir bauen das selbst, weil
// Paddle's formatted_totals nicht auf jedem Endpoint zurueckkommt und
// das Locale (de-DE vs. en-US) unklar ist. Fallback: "12000 EUR".
function formatMinorAmount(minor: string | null, currency: string | null): string | null {
  if (!minor || !currency) return null;
  const cents = parseInt(minor, 10);
  if (!Number.isFinite(cents)) return null;
  try {
    return new Intl.NumberFormat('de-DE', {
      style:    'currency',
      currency: currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

// ── Orchestrator ─────────────────────────────────────────────

export interface CreateB2BTransactionInput {
  email: string;
  companyName: string;
  address: PaddleAddressInput;
  vatId?: string | null;            // null = kein business
  discountCode?: string | null;     // null = kein discount
  priceId: string;
  quantity?: number;
  customData?: Record<string, unknown>;
}

export interface CreateB2BTransactionResult {
  transactionId: string;
  customerId: string;
  addressId: string;
  businessId: string | null;
  discountId: string | null;
  totals: PaddleTransactionTotals | null;
}

// Erstellt (oder findet) alle noetigen Paddle-Entitaeten und am Ende eine
// Transaction. Die Reihenfolge ist defensive: jede Kette wird nur dann
// ausgefuehrt, wenn der vorherige Schritt erfolgreich war.
export async function paddleCreateB2BTransaction(
  env: Env,
  input: CreateB2BTransactionInput,
): Promise<CreateB2BTransactionResult> {
  let discountId: string | null = null;
  if (input.discountCode) {
    const discount = await paddleFindDiscountByCode(env, input.discountCode);
    if (!discount) {
      throw new PaddleApiError(404, 'discount_not_found',
        `Rabattcode "${input.discountCode}" ist Paddle nicht bekannt.`);
    }
    discountId = discount.id;
  }

  const customer = await paddleFindOrCreateCustomer(env, input.email, input.companyName);
  const address  = await paddleCreateCustomerAddress(env, customer.id, input.address);

  let business: PaddleBusiness | null = null;
  if (input.vatId) {
    business = await paddleCreateCustomerBusiness(
      env, customer.id, input.companyName, input.vatId,
    );
  }

  const tx = await paddleCreateTransaction(env, {
    priceId:    input.priceId,
    quantity:   input.quantity ?? 1,
    customerId: customer.id,
    addressId:  address.id,
    businessId: business?.id,
    discountId: discountId ?? undefined,
    customData: input.customData,
  });

  return {
    transactionId: tx.id,
    customerId:    customer.id,
    addressId:     address.id,
    businessId:    business?.id ?? null,
    discountId,
    totals:        tx.details?.totals ?? null,
  };
}
