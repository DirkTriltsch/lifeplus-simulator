// Reine Validierung des Checkout-Intent-Requests (ohne D1/Paddle), damit sie
// per Unit-Test abgedeckt werden kann. Verwendet von
// functions/api/billing/checkout-intent.ts.
//
// Verbraucher/Unternehmer-Modell (aus TraderScope uebernommen):
//   - buyerType 'consumer': billingName Pflicht, kein Firmenname, keine
//     USt-IdNr, keine B2B-Bestaetigung. Widerrufsverzicht optional.
//   - buyerType 'business': companyName Pflicht, USt-IdNr optional,
//     B2B-Bestaetigung Pflicht (Legal-Review Finding 7). Fehlt buyerType,
//     gilt 'business' (Abwaertskompatibilitaet zum bisherigen B2B-Client).

export type BuyerType = 'consumer' | 'business';

export const ALLOWED_PLANS = ['monthly', 'halfyear', 'yearly'] as const;
export type PlanKey = (typeof ALLOWED_PLANS)[number];

export const ALLOWED_COUNTRIES = new Set([
  'DE', 'AT', 'CH',
  'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HU', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const VAT_RX = /^[A-Z]{2}[A-Z0-9]{8,12}$/;
const NAME_MIN = 2;
const NAME_MAX = 200;
const STREET_MIN = 3;
const POSTAL_MIN = 3;
const CITY_MIN = 2;
const DISCOUNT_MAX = 40;

export interface CheckoutIntentBody {
  plan?: string;
  checkoutEmail?: string;
  buyerType?: string;
  /** Verbraucher: Vor- und Nachname. */
  billingName?: string;
  /** Unternehmer: Firmenname. */
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

export interface ValidatedCheckoutIntent {
  buyerType: BuyerType;
  checkoutEmail: string;
  /** Name, der als Paddle-Kunde/Rechnungsempfaenger verwendet wird. */
  displayName: string;
  /** Nur bei business gesetzt. */
  companyName: string | null;
  /** Nur bei consumer gesetzt. */
  billingName: string | null;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  discountCode: string | null;
  /** Bei consumer immer null. */
  vatId: string | null;
  /** Bei consumer immer null. */
  b2bConfirmationVersion: string | null;
  displayedHintsHash: string | null;
  newsletter: boolean;
  /** Nur fuer consumer relevant; bei business immer false. */
  withdrawalWaiver: boolean;
  consentVersion: string | null;
  consentTimestamp: string | null;
}

export type ValidationResult =
  | { ok: true; value: ValidatedCheckoutIntent }
  | { ok: false; error: string };

export function parsePlan(raw: string | undefined): PlanKey | null {
  const plan = (raw ?? '').trim();
  return (ALLOWED_PLANS as readonly string[]).includes(plan) ? (plan as PlanKey) : null;
}

export function validateCheckoutIntentBody(body: CheckoutIntentBody): ValidationResult {
  const checkoutEmail = (body.checkoutEmail ?? '').trim().toLowerCase();
  if (!checkoutEmail || !EMAIL_RX.test(checkoutEmail) || checkoutEmail.length > 254) {
    return { ok: false, error: 'invalid_email' };
  }

  const buyerType: BuyerType = body.buyerType === 'consumer' ? 'consumer' : 'business';

  let companyName: string | null = null;
  let billingName: string | null = null;
  if (buyerType === 'business') {
    const name = (body.companyName ?? '').trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return { ok: false, error: 'invalid_company_name' };
    }
    companyName = name;
  } else {
    const name = (body.billingName ?? '').trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return { ok: false, error: 'invalid_billing_name' };
    }
    billingName = name;
  }

  const street = (body.street ?? '').trim();
  if (street.length < STREET_MIN) return { ok: false, error: 'invalid_street' };
  const postalCode = (body.postalCode ?? '').trim();
  if (postalCode.length < POSTAL_MIN) return { ok: false, error: 'invalid_postal_code' };
  const city = (body.city ?? '').trim();
  if (city.length < CITY_MIN) return { ok: false, error: 'invalid_city' };
  const countryCode = (body.countryCode ?? '').trim().toUpperCase();
  if (!ALLOWED_COUNTRIES.has(countryCode)) return { ok: false, error: 'invalid_country' };

  const discountRaw = (body.discountCode ?? '').trim().toUpperCase();
  if (discountRaw.length > DISCOUNT_MAX) return { ok: false, error: 'invalid_discount_code' };
  const discountCode = discountRaw.length > 0 ? discountRaw : null;

  let vatId: string | null = null;
  if (buyerType === 'business') {
    const vatRaw = (body.vatId ?? '').replace(/\s/g, '').toUpperCase();
    if (vatRaw.length > 0 && !VAT_RX.test(vatRaw)) return { ok: false, error: 'invalid_vat_id' };
    vatId = vatRaw.length > 0 ? vatRaw : null;
  }

  let b2bConfirmationVersion: string | null = null;
  let displayedHintsHash: string | null = null;
  if (buyerType === 'business') {
    const version = (body.b2bConfirmation?.version ?? '').trim();
    const hash = (body.b2bConfirmation?.displayedHintsHash ?? '').trim();
    if (body.b2bConfirmation?.checked !== true || !version || !hash) {
      return { ok: false, error: 'missing_b2b_confirmation' };
    }
    b2bConfirmationVersion = version;
    displayedHintsHash = hash;
  }

  if (body.consent?.agb !== true || body.consent?.privacy !== true) {
    return { ok: false, error: 'missing_required_consent' };
  }

  return {
    ok: true,
    value: {
      buyerType,
      checkoutEmail,
      displayName: (buyerType === 'business' ? companyName : billingName) as string,
      companyName,
      billingName,
      street,
      postalCode,
      city,
      countryCode,
      discountCode,
      vatId,
      b2bConfirmationVersion,
      displayedHintsHash,
      newsletter: body.consent?.newsletter === true,
      withdrawalWaiver: buyerType === 'consumer' && body.consent?.withdrawal_waiver === true,
      consentVersion: body.consent?.version ?? null,
      consentTimestamp: body.consent?.timestamp ?? null,
    },
  };
}
