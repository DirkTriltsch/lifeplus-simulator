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
